import { useState, useRef, useEffect } from 'react'
import type { WorkingMealTotals, OcrTotals } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  totals: WorkingMealTotals | OcrTotals
  origin?: 'ai_estimated' | 'verified_label'
  onSaved?: () => void
}

function fmt(val: number | null | undefined): string {
  return val == null ? '—' : val.toFixed(1)
}

interface Row {
  label: string
  value: string
  badge?: 'pass' | 'fail'
}

type SaveState = 'idle' | 'naming' | 'saving' | 'saved' | 'error'

export default function MacroCard({ totals, origin, onSaved }: Props) {
  const { user } = useAuth()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [name, setName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (saveState === 'naming') {
      inputRef.current?.focus()
    }
  }, [saveState])

  const proteinPass = totals.calories != null && totals.protein_g != null && totals.protein_g >= totals.calories * 0.05
  const fiberPass = totals.calories != null && totals.fiber_g != null && totals.fiber_g >= totals.calories * 0.015

  const rows: Row[] = [
    { label: 'Calories', value: fmt(totals.calories) + ' kcal' },
    {
      label: 'Protein',
      value: fmt(totals.protein_g) + ' g',
      badge: totals.calories != null && totals.calories > 0 ? (proteinPass ? 'pass' : 'fail') : undefined,
    },
    { label: 'Fat', value: fmt(totals.fat_g) + ' g' },
    { label: 'Total Carbs', value: fmt(totals.carbs_g) + ' g' },
    {
      label: 'Fiber',
      value: fmt(totals.fiber_g) + ' g',
      badge: totals.calories != null && totals.calories > 0 ? (fiberPass ? 'pass' : 'fail') : undefined,
    },
    { label: 'Sugar', value: fmt(totals.sugar_g) + ' g' },
  ]

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaveState('saving')
    setErrorMsg('')
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
      tags: [],
      protected: false,
      version: 1,
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setSaveState('idle')
      setName('')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm w-full max-w-[80%]">
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

          {(saveState === 'naming' || saveState === 'saving' || saveState === 'error') && (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Name this label…"
                  disabled={saveState === 'saving'}
                  className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving' || !name.trim()}
                  className="text-xs bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium px-2.5 py-1.5 rounded-lg"
                >
                  {saveState === 'saving' ? 'Saving…' : 'Save'}
                </button>
              </div>
              {saveState === 'error' && (
                <p className="text-xs text-red-600">{errorMsg || 'Save failed. Try again.'}</p>
              )}
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
