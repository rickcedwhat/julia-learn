import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import ContextTray from '@/components/ContextTray'
import LabelSearchPanel from '@/components/LabelSearchPanel'
import { useWorkingMeal } from '@/hooks/useWorkingMeal'
import { useUserRules } from '@/hooks/useUserRules'
import { useAuth } from '@/hooks/useAuth'
import { sendMessage, ocrImage } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'
import type { Message, BatchDerivation } from '@/components/ChatMessage'
import type { ContextLabel } from '@/components/ContextTray'
import type { ChatMessage as GeminiMessage, OcrTotals, WorkingMealTotals } from '@/lib/gemini'

let idCounter = 0
function nextId() {
  return String(++idCounter)
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

/** Strip image data URLs before persisting — they're too large for jsonb. */
function stripImages(msgs: Message[]): Message[] {
  return msgs.map((m) => {
    const stripped: Message = { ...m }
    delete stripped.imageDataUrl
    delete stripped.ocrImageUrl
    return stripped
  })
}

/** Build the leading context message injected into Gemini history. */
function buildContextPreamble(labels: ContextLabel[]): string {
  if (labels.length === 0) return ''
  const list = labels.map((l) => macroSummary(l.name, l.macros)).join('\n')
  return `The following nutrition labels are loaded in context:\n${list}\n\nUse these values when the user mentions these foods.`
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [contextLabels, setContextLabels] = useState<ContextLabel[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | null>(null)
  const { workingMeal, update } = useWorkingMeal()
  const [searchParams, setSearchParams] = useSearchParams()
  const { rules } = useUserRules()
  const { user } = useAuth()

  // Load most recent chat session on mount (once user is known)
  useEffect(() => {
    if (!user) return
    void (async () => {
      const { data } = await supabase
        .from('chat_sessions')
        .select('id, messages')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (data?.[0]) {
        sessionIdRef.current = data[0].id as string
        setMessages(data[0].messages as Message[])
      } else {
        const { data: created } = await supabase
          .from('chat_sessions')
          .insert({ user_id: user.id, messages: [] })
          .select('id')
          .single()
        if (created) sessionIdRef.current = created.id as string
      }
    })()
  }, [user])

  async function persistMessages(msgs: Message[]) {
    const sid = sessionIdRef.current
    if (!sid) return
    await supabase
      .from('chat_sessions')
      .update({ messages: stripImages(msgs), updated_at: new Date().toISOString() })
      .eq('id', sid)
  }

  async function handleNewChat() {
    if (!user) return
    const { data } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, messages: [] })
      .select('id')
      .single()
    if (data) {
      sessionIdRef.current = data.id as string
      setMessages([])
    }
  }

  // ── Context helpers ────────────────────────────────────────────────────────

  function addToContext(label: ContextLabel) {
    setContextLabels((prev) => {
      if (prev.some((l) => l.key === label.key)) return prev
      return [...prev, label]
    })
  }

  function removeFromContext(key: string) {
    setContextLabels((prev) => prev.filter((l) => l.key !== key))
  }

  /** Called by MacroCard after a successful library save. */
  function handleLabelSaved(savedId: string, savedName: string) {
    setContextLabels((prev) => {
      const existing = prev.find((l) => l.name === savedName || l.id === savedId)
      if (existing) {
        return prev.map((l) =>
          l.name === savedName || l.id === savedId
            ? { ...l, id: savedId, name: savedName }
            : l,
        )
      }
      return prev
    })
  }

  /** Called when user clicks "Log Meal" on a MacroCard — injects a SaveWidget. */
  function handleLogMealRequest(totals: WorkingMealTotals | OcrTotals) {
    const widgetMsg: Message = {
      id: nextId(),
      role: 'assistant',
      text: '',
      saveWidget: {
        suggestedName: '',
        totals: totals as WorkingMealTotals,
      },
      rules,
    }
    setMessages((prev) => [...prev, widgetMsg])
  }

  // ── Deep-links ─────────────────────────────────────────────────────────────

  useEffect(() => {
    // ?label=<id> → silently load into context tray
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
          addToContext({
            key: labelId,
            id: labelId,
            name: label.name,
            macros: {
              calories:  label.calories,
              protein_g: label.protein_g,
              fat_g:     label.fat_g,
              carbs_g:   label.carbs_g,
              fiber_g:   label.fiber_g,
              sugar_g:   label.sugar_g,
            },
            origin: 'library',
          })
        }
        setSearchParams({})
      })()
    }

    // ?batch=<id>&portionG=<g> → show MacroCard + add to context tray
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
              const sm = (v: number | null) => (v != null ? v * scale : null)
              const scaledMacros: OcrTotals = {
                calories:  sm(batch.total_macros.calories),
                protein_g: sm(batch.total_macros.protein_g),
                fat_g:     sm(batch.total_macros.fat_g),
                carbs_g:   sm(batch.total_macros.carbs_g),
                fiber_g:   sm(batch.total_macros.fiber_g),
                sugar_g:   sm(batch.total_macros.sugar_g),
              }
              update({
                components: [],
                totals: {
                  calories:  scaledMacros.calories  ?? 0,
                  protein_g: scaledMacros.protein_g ?? 0,
                  fat_g:     scaledMacros.fat_g     ?? 0,
                  carbs_g:   scaledMacros.carbs_g   ?? 0,
                  fiber_g:   scaledMacros.fiber_g   ?? 0,
                  sugar_g:   scaledMacros.sugar_g   ?? 0,
                },
                message: '',
              })
              const recipeName = batch.recipes?.name
              const displayName = recipeName
                ? `${portionGrams}g · ${recipeName} → ${batch.name}`
                : `${portionGrams}g · ${batch.name}`
              const derivation: BatchDerivation = {
                portionG: portionGrams,
                totalWeightG: batch.total_weight_g,
                batchName: batch.name,
                recipeName: recipeName ?? undefined,
              }
              addToContext({
                key: `batch-${batchId}-${portionGrams}`,
                name: displayName,
                macros: scaledMacros,
                origin: 'batch',
              })
              // Still show the MacroCard in chat for the scaled portion breakdown
              const assistantMsg: Message = {
                id: nextId(),
                role: 'assistant',
                text: '',
                geminiText: macroSummary(displayName, scaledMacros),
                ocrTotals: scaledMacros,
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
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, logged: true } : m)),
    )
    const confirmMsg: Message = {
      id: nextId(),
      role: 'assistant',
      text: confirmationText,
    }
    setMessages((prev) => [...prev, confirmMsg])
  }

  // ── Library panel select ───────────────────────────────────────────────────

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
      addToContext({
        key: labelId,
        id: labelId,
        name: labelName,
        macros: {
          calories:  label.calories,
          protein_g: label.protein_g,
          fat_g:     label.fat_g,
          carbs_g:   label.carbs_g,
          fiber_g:   label.fiber_g,
          sugar_g:   label.sugar_g,
        },
        origin: 'library',
      })
    }
    setLibraryOpen(false)
  }

  // ── Chat send ──────────────────────────────────────────────────────────────

  async function handleSend(text: string) {
    const userMsg: Message = { id: nextId(), role: 'user', text }
    const withUser = [...messages, userMsg]
    setMessages(withUser)
    setLoading(true)

    const workingTotalsSnapshot = { ...workingMeal.totals }

    // Prepend loaded context labels as the first model turn so Gemini never
    // loses track of scanned/loaded nutrition data, even after many exchanges.
    const contextPreamble = buildContextPreamble(contextLabels)
    const history: GeminiMessage[] = [
      ...(contextPreamble
        ? [{ role: 'model' as const, text: contextPreamble }]
        : []),
      ...messages.map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        text: m.geminiText ?? m.text,
      })),
      { role: 'user', text },
    ]

    try {
      const meal = await sendMessage(history)
      update(meal)

      const hasComponents = meal.components.length > 0
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
      const withAssistant = [...withUser, assistantMsg]
      setMessages(withAssistant)
      void persistMessages(withAssistant)
    } catch {
      const errorMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: 'Sorry, something went wrong. Please try again.',
      }
      const withError = [...withUser, errorMsg]
      setMessages(withError)
      void persistMessages(withError)
    } finally {
      setLoading(false)
    }
  }

  // ── Photo / OCR ────────────────────────────────────────────────────────────

  async function handlePhoto(file: File) {
    if (loading) return
    setLoading(true)

    try {
      const { base64, dataUrl } = await readFileAsBase64(file)

      const userMsg: Message = {
        id: nextId(),
        role: 'user',
        text: '',
        imageDataUrl: dataUrl,
      }
      const withUser = [...messages, userMsg]
      setMessages(withUser)

      const extracted = await ocrImage(base64, file.type)

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

      // Add to context tray — name updates to the saved name when user saves to library
      const ocrKey = `ocr-${nextId()}`
      addToContext({
        key: ocrKey,
        name: 'Scanned label',
        macros: extracted,
        origin: 'scanned',
      })

      const assistantMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: 'Here are the nutrition facts I found:',
        geminiText: macroSummary('scanned label', extracted),
        ocrTotals: extracted,
        ocrImageUrl: dataUrl,
        rules,
      }
      const withAssistant = [...withUser, assistantMsg]
      setMessages(withAssistant)
      void persistMessages(withAssistant)
    } catch {
      const errorMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: 'Sorry, I could not read that nutrition label. Please try a clearer photo.',
      }
      const withError = [...messages, errorMsg]
      setMessages(withError)
      void persistMessages(withError)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {messages.length > 0 && (
        <div className="flex justify-end px-4 pt-2">
          <button
            type="button"
            onClick={() => { void handleNewChat() }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            New chat
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !loading && (
          <p className="text-center text-gray-400 text-sm mt-8">
            Tell me what you ate and I&apos;ll track your macros.
          </p>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onLogged={handleLogged}
            onLabelSaved={handleLabelSaved}
            onLogMeal={handleLogMealRequest}
          />
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
      <ContextTray
        labels={contextLabels}
        onRemove={removeFromContext}
        onOpenLibrary={() => setLibraryOpen(true)}
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
