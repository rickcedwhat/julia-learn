import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import LabelSearchPanel from '@/components/LabelSearchPanel'
import { useWorkingMeal } from '@/hooks/useWorkingMeal'
import { useUserRules } from '@/hooks/useUserRules'
import { sendMessage, ocrImage } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'
import type { Message, BatchDerivation } from '@/components/ChatMessage'
import type { ChatMessage as GeminiMessage } from '@/lib/gemini'

let idCounter = 0
function nextId() {
  return String(++idCounter)
}

/** Build a macro summary string that Gemini can reference in later turns. */
function macroSummary(
  name: string,
  t: {
    calories?: number | null
    protein_g?: number | null
    fat_g?: number | null
    carbs_g?: number | null
    fiber_g?: number | null
    sugar_g?: number | null
  },
): string {
  const r = (v: number | null | undefined) => (v != null ? Math.round(v) : '?')
  return (
    `Nutrition info for "${name}": ` +
    `${r(t.calories)} kcal, ${r(t.protein_g)}g protein, ${r(t.fat_g)}g fat, ` +
    `${r(t.carbs_g)}g carbs, ${r(t.fiber_g)}g fiber, ${r(t.sugar_g)}g sugar. ` +
    `Use these exact values when the user describes how much of this they ate.`
  )
}

function readFileAsBase64(file: File): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      resolve({ base64, dataUrl })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { workingMeal, update } = useWorkingMeal()
  const [searchParams, setSearchParams] = useSearchParams()
  const { rules } = useUserRules()

  // Deep-link: ?label=<id> → load label into working meal
  useEffect(() => {
    const labelId = searchParams.get('label')
    if (labelId) {
      void (async () => {
        const { data, error } = await supabase
          .from('labels')
          .select('*')
          .eq('id', labelId)
          .single()

        if (!error && data) {
          const label = data as {
            name: string
            calories: number | null
            protein_g: number | null
            fat_g: number | null
            carbs_g: number | null
            fiber_g: number | null
            sugar_g: number | null
          }
          update({
            components: [],
            totals: {
              calories:  label.calories  ?? 0,
              protein_g: label.protein_g ?? 0,
              fat_g:     label.fat_g     ?? 0,
              carbs_g:   label.carbs_g   ?? 0,
              fiber_g:   label.fiber_g   ?? 0,
              sugar_g:   label.sugar_g   ?? 0,
            },
            message: '',
          })
          const assistantMsg: Message = {
            id: nextId(),
            role: 'assistant',
            text: `I've loaded ${label.name} into your working meal.`,
            geminiText: macroSummary(label.name, label),
          }
          setMessages((prev) => [...prev, assistantMsg])
        }
        // Clear the query param regardless of success/failure
        setSearchParams({})
      })()
    }

    // Deep-link: ?batch=<id>&portionG=<g> → load scaled batch into working meal
    const batchId = searchParams.get('batch')
    const portionGStr = searchParams.get('portionG')
    if (batchId && portionGStr) {
      const portionGrams = parseFloat(portionGStr)
      if (!isNaN(portionGrams) && portionGrams > 0) {
        void (async () => {
          const { data, error } = await supabase
            .from('batches')
            .select('*, recipes(name)')
            .eq('id', batchId)
            .single()

          if (!error && data) {
            const batch = data as {
              name: string
              total_weight_g: number | null
              total_macros: {
                calories: number | null
                protein_g: number | null
                fat_g: number | null
                carbs_g: number | null
                fiber_g: number | null
                sugar_g: number | null
              } | null
              recipes: { name: string } | null
            }

            if (batch.total_weight_g && batch.total_macros) {
              const scale = portionGrams / batch.total_weight_g
              const scale_macro = (v: number | null) => (v != null ? v * scale : 0)
              const scaledTotals = {
                calories:  scale_macro(batch.total_macros.calories),
                protein_g: scale_macro(batch.total_macros.protein_g),
                fat_g:     scale_macro(batch.total_macros.fat_g),
                carbs_g:   scale_macro(batch.total_macros.carbs_g),
                fiber_g:   scale_macro(batch.total_macros.fiber_g),
                sugar_g:   scale_macro(batch.total_macros.sugar_g),
              }
              update({
                components: [],
                totals: scaledTotals,
                message: '',
              })
              const recipeName = batch.recipes?.name
              const label = recipeName ? `${recipeName} → ${batch.name}` : batch.name
              const derivation: BatchDerivation = {
                portionG: portionGrams,
                totalWeightG: batch.total_weight_g,
                batchName: batch.name,
                recipeName: recipeName ?? undefined,
              }
              const assistantMsg: Message = {
                id: nextId(),
                role: 'assistant',
                text: `I've loaded ${portionGrams}g of ${label} into your working meal.`,
                geminiText: macroSummary(`${portionGrams}g of ${label}`, scaledTotals),
                ocrTotals: scaledTotals,
                rules,
                batchDerivation: derivation,
              }
              setMessages((prev) => [...prev, assistantMsg])
            }
          }
          setSearchParams({})
        })()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleLogged(messageId: string, confirmationText: string) {
    // Mark the widget message as logged (converts to read-only summary)
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, logged: true } : m)),
    )
    // Append a confirmation message in the chat thread
    const confirmMsg: Message = {
      id: nextId(),
      role: 'assistant',
      text: confirmationText,
    }
    setMessages((prev) => [...prev, confirmMsg])
  }

  async function handleLibrarySelect(labelId: string, labelName: string) {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('id', labelId)
      .single()

    if (!error && data) {
      const label = data as {
        name: string
        calories: number | null
        protein_g: number | null
        fat_g: number | null
        carbs_g: number | null
        fiber_g: number | null
        sugar_g: number | null
      }
      update({
        components: [],
        totals: {
          calories:  label.calories  ?? 0,
          protein_g: label.protein_g ?? 0,
          fat_g:     label.fat_g     ?? 0,
          carbs_g:   label.carbs_g   ?? 0,
          fiber_g:   label.fiber_g   ?? 0,
          sugar_g:   label.sugar_g   ?? 0,
        },
        message: '',
      })
      const assistantMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: `I've loaded "${labelName}" into your working meal. You can tell me how much you had, or add more items.`,
        geminiText: macroSummary(label.name, label),
        rules,
      }
      setMessages((prev) => [...prev, assistantMsg])
    }
    setLibraryOpen(false)
  }

  async function handleSend(text: string) {
    const userMsg: Message = { id: nextId(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    // Snapshot working meal totals BEFORE Gemini call so we can fall back to
    // the accumulated state if Gemini re-estimates with empty components.
    const workingTotalsSnapshot = { ...workingMeal.totals }

    const history: GeminiMessage[] = [
      ...messages.map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        // Use geminiText when available — it carries actual macro numbers for
        // OCR / library-load messages whose display text is intentionally vague.
        text: m.geminiText ?? m.text,
      })),
      { role: 'user', text },
    ]

    try {
      const meal = await sendMessage(history)
      update(meal)

      const hasComponents = meal.components.length > 0

      // Prefer Gemini's fresh totals when it returned components with positive
      // calories; otherwise fall back to the pre-call working meal snapshot.
      const widgetTotals =
        hasComponents && meal.totals.calories > 0 ? meal.totals : workingTotalsSnapshot

      const assistantMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: meal.message,
        rules,
        ...(meal.ready_to_log && hasComponents
          ? {
              saveWidget: {
                suggestedName: meal.suggested_name ?? 'My Meal',
                totals: widgetTotals,
              },
            }
          : { mealTotals: hasComponents ? meal.totals : undefined }),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      const errorMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: 'Sorry, something went wrong. Please try again.',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  async function handlePhoto(file: File) {
    if (loading) return
    setLoading(true)

    try {
      const { base64, dataUrl } = await readFileAsBase64(file)

      // Show image preview immediately as a user message
      const userMsg: Message = {
        id: nextId(),
        role: 'user',
        text: '',
        imageDataUrl: dataUrl,
      }
      setMessages((prev) => [...prev, userMsg])

      // Run OCR via Gemini Vision
      const extracted = await ocrImage(base64, file.type)

      // Populate working meal state so subsequent chat messages know about this label
      update({
        components: [],
        totals: {
          calories: extracted.calories ?? 0,
          protein_g: extracted.protein_g ?? 0,
          fat_g: extracted.fat_g ?? 0,
          carbs_g: extracted.carbs_g ?? 0,
          fiber_g: extracted.fiber_g ?? 0,
          sugar_g: extracted.sugar_g ?? 0,
        },
        message: '',
      })

      // Show assistant message with MacroCard
      const assistantMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: 'Here are the nutrition facts I found:',
        // geminiText carries the actual macro numbers so Gemini retains this
        // context in subsequent turns (the display text is intentionally brief).
        geminiText: macroSummary('scanned label', extracted),
        ocrTotals: extracted,
        rules,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      const errorMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: 'Sorry, I could not read that nutrition label. Please try a clearer photo.',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !loading && (
          <p className="text-center text-gray-400 text-sm mt-8">
            Tell me what you ate and I&apos;ll track your macros.
          </p>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} onLogged={handleLogged} />
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-gray-100 text-gray-500 text-sm">
              ...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <LabelSearchPanel
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={handleLibrarySelect}
      />
      <ChatInput
        onSend={handleSend}
        onPhoto={handlePhoto}
        onLibraryOpen={() => setLibraryOpen(true)}
        disabled={loading}
      />
    </div>
  )
}
