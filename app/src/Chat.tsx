import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import ContextTray from '@/components/ContextTray'
import LabelSearchPanel from '@/components/LabelSearchPanel'
import { useWorkingMeal } from '@/hooks/useWorkingMeal'
import { useUserRules } from '@/hooks/useUserRules'
import { useAuth } from '@/hooks/useAuth'
import { sendMessage, ocrImage, inferSuggestions } from '@/lib/gemini'
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
    serving_size?: string | null
  },
): string {
  const r = (v: number | null | undefined) => (v != null ? Math.round(v) : '?')
  const serving = t.serving_size ? ` 1 serving = ${t.serving_size}.` : ''
  return (
    `Nutrition info for "${name}":${serving} ` +
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
  const [suggestions, setSuggestions] = useState<ContextLabel[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | null>(null)
  const { workingMeal, update } = useWorkingMeal()
  const [searchParams, setSearchParams] = useSearchParams()
  const { rules } = useUserRules()
  const { user } = useAuth()

  // Load most recent chat session on mount (once user is known).
  // If no session exists yet, leave sessionIdRef null — it gets created lazily
  // on the first persistMessages call so we never write empty sessions.
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
      }
      // No else — sessionIdRef stays null until the first message is sent.
    })()
  }, [user])

  async function persistMessages(msgs: Message[]) {
    if (!user) return
    let sid = sessionIdRef.current
    if (!sid) {
      // Create the session row lazily on the first real message.
      const { data } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, messages: [] })
        .select('id')
        .single()
      if (!data) return
      sid = data.id as string
      sessionIdRef.current = sid
    }
    await supabase
      .from('chat_sessions')
      .update({ messages: stripImages(msgs), updated_at: new Date().toISOString() })
      .eq('id', sid)
  }

  function handleNewChat() {
    // Just reset local state — don't write an empty row to the DB.
    // The next message will create a fresh session lazily.
    sessionIdRef.current = null
    setMessages([])
    setSuggestions([])
  }

  function handleFlag() {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const flagMsg: Message = {
      id: nextId(),
      role: 'assistant',
      text: `Issue reported at ${timeStr}`,
      flagged: true,
    }
    const withFlag = [...messages, flagMsg]
    setMessages(withFlag)
    void persistMessages(withFlag)
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
            serving_size: string | null
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
              calories:     label.calories,
              protein_g:    label.protein_g,
              fat_g:        label.fat_g,
              carbs_g:      label.carbs_g,
              fiber_g:      label.fiber_g,
              sugar_g:      label.sugar_g,
              serving_size: label.serving_size,
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
        serving_size: string | null
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
          calories:     label.calories,
          protein_g:    label.protein_g,
          fat_g:        label.fat_g,
          carbs_g:      label.carbs_g,
          fiber_g:      label.fiber_g,
          sugar_g:      label.sugar_g,
          serving_size: label.serving_size,
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

      // Background: suggest library labels that pair well with the current meal.
      // Only when the meal is in-progress (not ready to log) and has components.
      if (!meal.ready_to_log && meal.components.length > 0 && user) {
        setSuggestions([]) // clear stale chips immediately
        void (async () => {
          try {
            const { data: labelRows } = await supabase
              .from('labels')
              .select('id, name, calories, protein_g, fat_g, carbs_g, fiber_g, sugar_g, serving_size')
              .eq('user_id', user.id)
              .order('name')

            if (!labelRows || labelRows.length === 0) return

            // Exclude labels already loaded in the context tray
            const contextIds = new Set(contextLabels.map((l) => l.id ?? l.key))
            type LabelRow = {
              id: string; name: string
              calories: number | null; protein_g: number | null; fat_g: number | null
              carbs_g: number | null; fiber_g: number | null; sugar_g: number | null
              serving_size: string | null
            }
            const candidates = (labelRows as LabelRow[]).filter((l) => !contextIds.has(l.id))
            if (candidates.length === 0) return

            const suggested = await inferSuggestions(
              meal.components.map((c) => c.name),
              candidates.map((c) => c.name),
            )

            const matched = suggested
              .map((name) => candidates.find((c) => c.name === name))
              .filter((c): c is LabelRow => c !== undefined)
              .map((c): ContextLabel => ({
                key: c.id,
                id: c.id,
                name: c.name,
                macros: {
                  calories: c.calories,
                  protein_g: c.protein_g,
                  fat_g: c.fat_g,
                  carbs_g: c.carbs_g,
                  fiber_g: c.fiber_g,
                  sugar_g: c.sugar_g,
                  serving_size: c.serving_size,
                },
                origin: 'library',
              }))

            setSuggestions(matched)
          } catch {
            // fail silently — suggestions are best-effort
          }
        })()
      } else {
        setSuggestions([])
      }
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

      // If Gemini couldn't read a single macro, the scan failed — don't
      // pollute context with "? kcal, ?g protein…" noise.
      const allNull =
        extracted.calories == null &&
        extracted.protein_g == null &&
        extracted.fat_g == null &&
        extracted.carbs_g == null

      if (allNull) {
        const errorMsg: Message = {
          id: nextId(),
          role: 'assistant',
          text: "I couldn't read any nutrition values from that image. Try a clearer, straight-on photo of the label.",
        }
        const withError = [...withUser, errorMsg]
        setMessages(withError)
        void persistMessages(withError)
        return
      }

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

      // Use the product name extracted by OCR; fall back to generic label
      const labelName = extracted.suggested_name ?? 'scanned label'

      // Add to context tray — name updates to the saved name when user saves to library
      const ocrKey = `ocr-${nextId()}`
      addToContext({
        key: ocrKey,
        name: extracted.suggested_name ?? 'Scanned label',
        macros: extracted,
        origin: 'scanned',
      })

      const assistantMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: 'Here are the nutrition facts I found:',
        geminiText: macroSummary(labelName, extracted),
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
        <div className="flex items-center justify-end gap-3 px-4 pt-2">
          <button
            type="button"
            onClick={handleFlag}
            title="Report an issue"
            className="text-xs text-amber-400 hover:text-amber-600 transition-colors"
          >
            ⚑ Report issue
          </button>
          <button
            type="button"
            onClick={handleNewChat}
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

      {suggestions.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-2 flex-wrap border-t border-gray-100">
          <span className="text-xs text-gray-400 shrink-0">Add to meal?</span>
          {suggestions.map((label) => (
            <button
              key={label.key}
              type="button"
              onClick={() => {
                addToContext(label)
                setSuggestions((prev) => prev.filter((s) => s.key !== label.key))
              }}
              className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              + {label.name}
            </button>
          ))}
        </div>
      )}

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
