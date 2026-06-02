import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import ContextTray from '@/components/ContextTray'
import LabelSearchPanel from '@/components/LabelSearchPanel'
import { useWorkingMeal } from '@/hooks/useWorkingMeal'
import { useUserRules } from '@/hooks/useUserRules'
import { useAuth } from '@/hooks/useAuth'
import { sendMessage, sendMessageWithImages, inferSuggestions } from '@/lib/gemini'
import type { ImageAttachment } from '@/lib/gemini'
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

interface SessionSummary {
  id: string
  updated_at: string
  preview: string
}

function sessionPreview(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first?.text) return 'Empty chat'
  return first.text.length > 60 ? first.text.slice(0, 60) + '…' : first.text
}

function groupByDay(sessions: SessionSummary[]): Array<{ day: string; items: SessionSummary[] }> {
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 864e5).toDateString()
  const map = new Map<string, SessionSummary[]>()
  for (const s of sessions) {
    const d = new Date(s.updated_at)
    let key: string
    if (d.toDateString() === today) key = 'Today'
    else if (d.toDateString() === yesterday) key = 'Yesterday'
    else key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }))
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [contextLabels, setContextLabels] = useState<ContextLabel[]>([])
  const [suggestions, setSuggestions] = useState<ContextLabel[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | null>(null)
  const { workingMeal, update } = useWorkingMeal()
  const [searchParams, setSearchParams] = useSearchParams()
  const { rules } = useUserRules()
  const { user } = useAuth()

  // Recipe context — set when chat is opened from a recipe's "Start Batch" button
  const [recipeContext, setRecipeContext] = useState<{
    id: string
    name: string
    ingredients: string
  } | null>(null)

  // Save-as-batch form state
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [batchFormName, setBatchFormName] = useState('')
  const [batchFormWeight, setBatchFormWeight] = useState('')
  const [savingBatch, setSavingBatch] = useState(false)
  const [batchSaveError, setBatchSaveError] = useState<string | null>(null)
  const [savedBatchId, setSavedBatchId] = useState<string | null>(null)

  // No auto-load on mount — chat starts fresh; prior sessions accessible via drawer.

  async function persistMessages(msgs: Message[]) {
    if (!user) return
    let sid = sessionIdRef.current
    const preview = sessionPreview(msgs)
    if (!sid) {
      // Create the session row lazily on the first real message.
      const { data } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, messages: [], preview })
        .select('id')
        .single()
      if (!data) return
      sid = data.id as string
      sessionIdRef.current = sid
    }
    await supabase
      .from('chat_sessions')
      .update({ messages: stripImages(msgs), updated_at: new Date().toISOString(), preview })
      .eq('id', sid)
  }

  function handleNewChat() {
    sessionIdRef.current = null
    setMessages([])
    setSuggestions([])
    setDrawerOpen(false)
  }

  async function openDrawer() {
    setDrawerOpen(true)
    if (!user) return
    setSessionsLoading(true)
    const { data } = await supabase
      .from('chat_sessions')
      .select('id, updated_at, preview')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(30)
    setSessionsLoading(false)
    if (data) {
      setSessions(
        (data as Array<{ id: string; updated_at: string; preview: string | null }>).map((s) => ({
          id: s.id,
          updated_at: s.updated_at,
          preview: s.preview ?? new Date(s.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        }))
      )
    }
  }

  function switchSession(session: SessionSummary) {
    void (async () => {
      const { data } = await supabase
        .from('chat_sessions')
        .select('id, messages')
        .eq('id', session.id)
        .single()
      if (data) {
        sessionIdRef.current = data.id as string
        setMessages(data.messages as Message[])
        setSuggestions([])
      }
      setDrawerOpen(false)
    })()
  }

  function handleFlag() {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const flagMsg: Message = {
      id: nextId(),
      role: 'assistant',
      text: `Issue reported at ${timeStr}`,
      flagged: true,
      skipGeminiHistory: true,
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
        suggestedName: workingMeal.suggested_name ?? '',
        totals: totals as WorkingMealTotals,
      },
      rules,
    }
    setMessages((prev) => [...prev, widgetMsg])
  }

  /** Persistent "Log meal" button — uses current working meal state directly. */
  function handleLogMealButton() {
    const widgetMsg: Message = {
      id: nextId(),
      role: 'assistant',
      text: '',
      saveWidget: {
        suggestedName: workingMeal.suggested_name ?? '',
        totals: workingMeal.totals,
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

    // ?meal=<id> → load past meal into context tray so user can riff on it
    const mealId = searchParams.get('meal')
    if (mealId) {
      void (async () => {
        const { data, error } = await supabase
          .from('meals')
          .select('name, meal_type, computed_macros')
          .eq('id', mealId)
          .single()
        if (!error && data) {
          const meal = data as {
            name: string
            meal_type: string
            computed_macros: {
              calories: number | null
              protein_g: number | null
              fat_g: number | null
              carbs_g: number | null
              fiber_g: number | null
              sugar_g: number | null
            }
          }
          addToContext({
            key: `meal-${mealId}`,
            id: undefined,
            name: meal.name,
            macros: {
              calories:     meal.computed_macros.calories,
              protein_g:    meal.computed_macros.protein_g,
              fat_g:        meal.computed_macros.fat_g,
              carbs_g:      meal.computed_macros.carbs_g,
              fiber_g:      meal.computed_macros.fiber_g,
              sugar_g:      meal.computed_macros.sugar_g,
              serving_size: null,
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
    // ?recipe=<id> → pre-seed chat with recipe ingredients, ready to build a batch
    const recipeId = searchParams.get('recipe')
    if (recipeId) {
      void (async () => {
        const { data, error } = await supabase
          .from('recipes')
          .select('id, name, ingredients')
          .eq('id', recipeId)
          .single()

        if (!error && data) {
          const recipe = data as { id: string; name: string; ingredients: string | null }
          if (recipe.ingredients) {
            setRecipeContext({ id: recipe.id, name: recipe.name, ingredients: recipe.ingredients })
            const introMsg: Message = {
              id: nextId(),
              role: 'assistant',
              text: `Ready to build a batch for **${recipe.name}**.\n\nStandard ingredients:\n${recipe.ingredients}\n\nTell me the actual quantities you used (or "same as recipe" if nothing changed), and I'll calculate the macros.`,
              geminiText: `Recipe context loaded: "${recipe.name}". Standard ingredients:\n${recipe.ingredients}\n\nWait for the user to confirm quantities before calculating macros.`,
            }
            setMessages([introMsg])
          }
        }
        setSearchParams({})
      })()
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
      skipGeminiHistory: true,
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

  async function handleLibrarySelectMultiple(selected: Array<{ id: string; name: string }>) {
    const results = await Promise.all(
      selected.map((s) =>
        supabase.from('labels').select('*').eq('id', s.id).single()
      )
    )
    for (let i = 0; i < results.length; i++) {
      const { data, error } = results[i]
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
        addToContext({
          key: selected[i].id,
          id: selected[i].id,
          name: selected[i].name,
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
    }
    setLibraryOpen(false)
  }

  // ── Save as Batch ──────────────────────────────────────────────────────────

  async function handleSaveBatch(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !recipeContext) return
    if (!batchFormName.trim()) {
      setBatchSaveError('Batch name is required')
      return
    }
    setSavingBatch(true)
    setBatchSaveError(null)

    const totalWeight = batchFormWeight !== '' ? parseFloat(batchFormWeight) : null
    const t = workingMeal.totals
    const { data, error } = await supabase
      .from('batches')
      .insert({
        user_id: user.id,
        recipe_id: recipeContext.id,
        name: batchFormName.trim(),
        total_weight_g: totalWeight,
        total_macros: {
          calories:  t.calories,
          protein_g: t.protein_g,
          fat_g:     t.fat_g,
          carbs_g:   t.carbs_g,
          fiber_g:   t.fiber_g,
          sugar_g:   t.sugar_g,
        },
      })
      .select('id')
      .single()

    setSavingBatch(false)
    if (error) {
      setBatchSaveError(error.message)
      return
    }
    setSavedBatchId((data as { id: string }).id)
    setShowBatchForm(false)
  }

  // ── Chat send ──────────────────────────────────────────────────────────────

  async function handleSend(text: string, files: File[] = []) {
    // Convert files once — reuse both base64 and dataUrl from the same read
    const converted = await Promise.all(files.map(readFileAsBase64))
    const imageAttachments: ImageAttachment[] = converted.map((c, i) => ({
      base64: c.base64,
      mimeType: files[i].type,
    }))
    const imageDataUrls = converted.map((c) => c.dataUrl)

    // For subsequent turns, store a text stand-in so history stays text-only
    const geminiText =
      files.length > 0
        ? `[Sent ${files.length} image${files.length > 1 ? 's' : ''}]${text ? ' ' + text : ''}`
        : undefined

    const userMsg: Message = {
      id: nextId(),
      role: 'user',
      text,
      ...(imageDataUrls.length > 0 ? { imageDataUrls, geminiText } : {}),
    }
    const withUser = [...messages, userMsg]
    setMessages(withUser)
    setLoading(true)

    const workingTotalsSnapshot = { ...workingMeal.totals }

    // Prepend loaded context labels as the first model turn so Gemini never
    // loses track of scanned/loaded nutrition data, even after many exchanges.
    const contextPreamble = buildContextPreamble(contextLabels)
    const rawHistory: GeminiMessage[] = [
      ...(contextPreamble
        ? [{ role: 'model' as const, text: contextPreamble }]
        : []),
      ...messages
        .filter((m) => !m.skipGeminiHistory)
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('model' as const),
          text: m.geminiText ?? m.text,
        })),
    ]
    // Gemini rejects consecutive same-role turns (e.g. preamble + batch card both
    // being model turns). Merge any adjacent same-role entries into one.
    const history = rawHistory.reduce<GeminiMessage[]>((acc, msg) => {
      const prev = acc[acc.length - 1]
      if (prev && prev.role === msg.role) {
        acc[acc.length - 1] = { role: prev.role, text: prev.text + '\n\n' + msg.text }
      } else {
        acc.push(msg)
      }
      return acc
    }, [])

    try {
      const meal =
        imageAttachments.length > 0
          ? await sendMessageWithImages(history, imageAttachments, text)
          : await sendMessage([...history, { role: 'user', text }])
      update(meal)

      const hasComponents = meal.components.length > 0
      const widgetTotals =
        hasComponents && meal.totals.calories > 0 ? meal.totals : workingTotalsSnapshot

      // Pass the full meal JSON back as geminiText so the next turn sees the
      // structured component list in history — prevents state loss when Gemini
      // tries to accumulate across turns (e.g. adding broccoli to orange chicken).
      const mealGeminiText = hasComponents
        ? JSON.stringify({ components: meal.components, totals: meal.totals, suggested_name: meal.suggested_name })
        : undefined

      const assistantMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: meal.message,
        geminiText: mealGeminiText,
        rules,
        // Carry the first image through so MacroCard can upload it to storage on save
        ...(imageDataUrls.length > 0 ? { ocrImageUrl: imageDataUrls[0] } : {}),
        ...(meal.ready_to_log && hasComponents
          ? {
              saveWidget: {
                suggestedName: meal.suggested_name ?? 'My Meal',
                totals: widgetTotals,
              },
            }
          : { mealTotals: hasComponents ? { ...meal.totals, serving_size: meal.serving_size ?? null } : undefined }),
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
    } catch (err) {
      console.error('Chat send failed:', err)
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const grouped = groupByDay(sessions)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Chat toolbar */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100">
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Chat history"
          className="text-gray-400 hover:text-gray-700 transition-colors p-1"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect x="2" y="4" width="16" height="2" rx="1"/>
            <rect x="2" y="9" width="16" height="2" rx="1"/>
            <rect x="2" y="14" width="16" height="2" rx="1"/>
          </svg>
        </button>
      </div>

      {/* Chat history drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-800 text-sm">Chats</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-3 border-b border-gray-100 space-y-1.5">
              <button
                type="button"
                onClick={handleNewChat}
                className="w-full text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-3 py-2 transition-colors text-left"
              >
                + New chat
              </button>
              <button
                type="button"
                onClick={() => { handleFlag(); setDrawerOpen(false) }}
                className="w-full text-sm text-amber-600 hover:text-amber-800 border border-amber-200 rounded-lg px-3 py-2 transition-colors text-left"
              >
                ⚑ Report issue
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessionsLoading ? (
                <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
              ) : grouped.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No previous chats.</p>
              ) : (
                grouped.map(({ day, items }) => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2">
                      {day}
                    </p>
                    {items.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => switchSession(s)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                          s.id === sessionIdRef.current ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="text-sm text-gray-800 truncate">{s.preview}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(s.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </p>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
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

      {/* Save as Batch — shown when a recipe is loaded and there are meal components */}
      {recipeContext && workingMeal.components.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 space-y-2">
          {savedBatchId ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
              <span className="text-sm text-green-700 font-medium">Batch saved!</span>
              <a
                href={`/batches/${savedBatchId}`}
                className="text-sm text-green-600 hover:text-green-800 underline"
              >
                View batch →
              </a>
            </div>
          ) : showBatchForm ? (
            <form
              onSubmit={(e) => void handleSaveBatch(e)}
              className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50"
            >
              <p className="text-xs font-semibold text-gray-600">Save as Batch</p>
              <input
                type="text"
                value={batchFormName}
                onChange={(e) => setBatchFormName(e.target.value)}
                placeholder="Batch name"
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={batchFormWeight}
                  onChange={(e) => setBatchFormWeight(e.target.value)}
                  placeholder="Total weight (g) — optional"
                  min="0"
                  step="any"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <span className="text-xs text-gray-400 shrink-0">g</span>
              </div>
              {batchSaveError && <p className="text-xs text-red-600">{batchSaveError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingBatch}
                  className="flex-1 text-sm py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {savingBatch ? 'Saving…' : 'Save Batch'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBatchForm(false); setBatchSaveError(null) }}
                  className="flex-1 text-sm py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBatchFormName(recipeContext.name)
                setBatchFormWeight('')
                setShowBatchForm(true)
              }}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-colors"
            >
              Save as Batch
            </button>
          )}
        </div>
      )}

      {workingMeal.components.length > 0 && !messages.some((m) => m.saveWidget && !m.logged) && (
        <div className="px-4 py-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleLogMealButton}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-colors"
          >
            Log meal
          </button>
        </div>
      )}

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
        onSelectMultiple={handleLibrarySelectMultiple}
        mealComponentNames={workingMeal.components.map((c) => c.name)}
        contextLabelIds={contextLabels.map((l) => l.id).filter((id): id is string => Boolean(id))}
      />
      <ContextTray
        labels={contextLabels}
        onRemove={removeFromContext}
        onOpenLibrary={() => setLibraryOpen(true)}
      />
      <ChatInput
        onSend={handleSend}
        onLibraryOpen={() => setLibraryOpen(true)}
        disabled={loading}
      />
    </div>
  )
}
