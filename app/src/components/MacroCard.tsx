import { useState, useRef, useEffect } from 'react'
import type { WorkingMealTotals, OcrTotals } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { UserRule } from '@/hooks/useUserRules'
import { evaluateRule } from '@/hooks/useUserRules'
import { computeMathTags } from '@/lib/tags'
import TagChips from '@/components/TagChips'

// ── Types & helpers ───────────────────────────────────────────────────────────

export interface BatchDerivation {
  portionG: number
  totalWeightG: number
  batchName: string
  recipeName?: string
}

interface Props {
  totals: WorkingMealTotals | OcrTotals
  origin?: 'ai_estimated' | 'verified_label'
  onSaved?: () => void
  /** Per-meal rules to evaluate. If omitted, falls back to hardcoded protein/fiber checks. */
  rules?: UserRule[]
  /** Batch portion scaling info to show at top of card */
  derivation?: BatchDerivation
}

function fmt(val: number | null | undefined): string {
  return val == null ? '—' : val.toFixed(1)
}

/** Map Macro enum → totals field name */
function macroToField(macro: UserRule['macro']): keyof (WorkingMealTotals & OcrTotals) {
  const map: Record<UserRule['macro'], keyof (WorkingMealTotals & OcrTotals)> = {
    calories: 'calories',
    protein:  'protein_g',
    fat:      'fat_g',
    carbs:    'carbs_g',
    fiber:    'fiber_g',
    sugar:    'sugar_g',
  }
  return map[macro]
}

interface Row {
  label: string
  value: string
  badge?: 'pass' | 'fail'
}

type SaveState = 'idle' | 'naming' | 'checking' | 'conflict' | 'saving' | 'saved' | 'error'

// ── Component ─────────────────────────────────────────────────────────────────

export default function MacroCard({ totals, origin, onSaved, rules, derivation }: Props) {
  const { user } = useAuth()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [name, setName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  // When a name collision is found, store the existing version so we can offer choices
  const [existingVersion, setExistingVersion] = useState<number>(1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (saveState === 'naming') {
      inputRef.current?.focus()
    }
  }, [saveState])

  // ── Badge logic ─────────────────────────────────────────────────────────────
  // If `rules` prop is provided, evaluate per-meal rules per macro row.
  // Otherwise fall back to hardcoded protein ≥ 5% and fiber ≥ 1.5% of calories.

  function getBadge(macro: UserRule['macro']): 'pass' | 'fail' | undefined {
    const cal = totals.calories ?? 0
    if (cal <= 0) return undefined

    if (rules !== undefined) {
      // Rule-driven
      const perMealRules = rules.filter((r) => r.scope === 'per_meal' && r.macro === macro)
      if (perMealRules.length === 0) return undefined
      const field = macroToField(macro)
      const macroVal = (totals[field] as number | null | undefined) ?? 0
      const allPass = perMealRules.every((r) => evaluateRule(r, macroVal, cal))
      return allPass ? 'pass' : 'fail'
    } else {
      // Hardcoded fallback
      if (macro === 'protein') {
        const pass = totals.protein_g != null && totals.protein_g >= cal * 0.05
        return pass ? 'pass' : 'fail'
      }
      if (macro === 'fiber') {
        const pass = totals.fiber_g != null && totals.fiber_g >= cal * 0.015
        return pass ? 'pass' : 'fail'
      }
      return undefined
    }
  }

  const mathTags = computeMathTags(totals)

  const rows: Row[] = [
    { label: 'Calories',    value: fmt(totals.calories)  + ' kcal', badge: getBadge('calories') },
    { label: 'Protein',     value: fmt(totals.protein_g) + ' g',    badge: getBadge('protein')  },
    { label: 'Fat',         value: fmt(totals.fat_g)     + ' g',    badge: getBadge('fat')      },
    { label: 'Total Carbs', value: fmt(totals.carbs_g)   + ' g',    badge: getBadge('carbs')    },
    { label: 'Fiber',       value: fmt(totals.fiber_g)   + ' g',    badge: getBadge('fiber')    },
    { label: 'Sugar',       value: fmt(totals.sugar_g)   + ' g',    badge: getBadge('sugar')    },
  ]

  // ── Save to Library ─────────────────────────────────────────────────────────

  /** Check for name collision, then show conflict UI or save directly. */
  async function handleCheckAndSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaveState('checking')
    setErrorMsg('')

    const { data } = await supabase
      .from('labels')
      .select('id, version')
      .eq('user_id', user?.id ?? '')
      .eq('name', trimmed)
      .order('version', { ascending: false })
      .limit(1)

    const existing = data?.[0]
    if (existing) {
      // Name collision — ask user what to do
      setExistingVersion(existing.version as number)
      setSaveState('conflict')
    } else {
      // No collision — save directly with version 1
      await doInsert(trimmed, 1)
    }
  }

  /** Insert the label with the given version. */
  async function doInsert(trimmed: string, version: number) {
    setSaveState('saving')
    const { error } = await supabase.from('labels').insert({
      user_id: user?.id ?? null,
      name: trimmed,
      origin: origin!,
      calories: totals.calories ?? null,
      protein_g: totals.protein_g ?? null,
      fat_g: totals.fat_g ?? null,
      carbs_g: totals.carbs_g ?? null,
      fiber_g: totals.fiber_g ?? null,
      sugar_g: totals.sugar_g ?? null,
      tags: computeMathTags(totals),
      protected: false,
      version,
    })
    if (error) {
      setErrorMsg(error.message)
      setSaveState('error')
    } else {
      setSavedName(trimmed)
      setSaveState('saved')
      onSaved?.()
    }
  }

  function handleSaveAsNewVersion() {
    void doInsert(name.trim(), existingVersion + 1)
  }

  function handleSaveAsNewLabel() {
    void doInsert(name.trim(), 1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleCheckAndSave()
    if (e.key === 'Escape') {
      setSaveState('idle')
      setName('')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm w-full max-w-[80%]">
      {derivation && (
        <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 mb-2">
          <p className="text-xs text-gray-500">
            {derivation.portionG}g of {derivation.totalWeightG}g
            {derivation.recipeName
              ? ` · ${derivation.recipeName} → ${derivation.batchName}`
              : ` · ${derivation.batchName}`}
            {' · '}{Math.round((derivation.portionG / derivation.totalWeightG) * 100)}%
          </p>
        </div>
      )}
      <p className="font-semibold text-gray-700 mb-2">Meal totals</p>
      <div className="divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1">
            <span className="text-gray-600">{row.label}</span>
            <span className="flex items-center gap-2 font-medium text-gray-900">
              {row.value}
              {row.badge === 'pass' && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓</span>
              )}
              {row.badge === 'fail' && (
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">✗</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Math-derived tag chips */}
      <TagChips tags={mathTags} />

      {/* Save to Library section */}
      {origin && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          {saveState === 'idle' && (
            <button
              onClick={() => setSaveState('naming')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Save to Library
            </button>
          )}

          {(saveState === 'naming' || saveState === 'checking' || saveState === 'saving' || saveState === 'error') && (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Name this label…"
                  disabled={saveState === 'checking' || saveState === 'saving'}
                  className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                />
                <button
                  onClick={() => void handleCheckAndSave()}
                  disabled={saveState === 'checking' || saveState === 'saving' || !name.trim()}
                  className="text-xs bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium px-2.5 py-1.5 rounded-lg"
                >
                  {saveState === 'checking' || saveState === 'saving' ? 'Saving…' : 'Save'}
                </button>
              </div>
              {saveState === 'error' && (
                <p className="text-xs text-red-600">{errorMsg || 'Save failed. Try again.'}</p>
              )}
            </div>
          )}

          {/* Version conflict resolution */}
          {saveState === 'conflict' && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-gray-600">
                A label named &ldquo;{name.trim()}&rdquo; already exists (v{existingVersion}). What would you like to do?
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={handleSaveAsNewVersion}
                  className="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white font-medium px-2 py-1.5 rounded-lg"
                >
                  Save as new version
                </button>
                <button
                  onClick={handleSaveAsNewLabel}
                  className="flex-1 text-xs bg-white hover:bg-gray-50 text-gray-700 font-medium px-2 py-1.5 rounded-lg border border-gray-200"
                >
                  Save as new label
                </button>
              </div>
            </div>
          )}

          {saveState === 'saved' && (
            <p className="text-xs text-green-700 font-medium">Saved as {savedName}!</p>
          )}
        </div>
      )}
    </div>
  )
}
