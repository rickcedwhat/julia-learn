import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { WorkingMealTotals } from '@/lib/gemini'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

function currentTimeHHMM(): string {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function suggestMealType(): MealType {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 21) return 'dinner'
  return 'snack'
}

function fmt(val: number): string {
  return val.toFixed(1)
}

interface Props {
  suggestedName: string
  totals: WorkingMealTotals
  onLogged: (confirmationText: string) => void
  onKeepEditing?: () => void
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

export default function SaveWidget({ suggestedName, totals, onLogged, onKeepEditing }: Props) {
  const { user } = useAuth()
  const [name, setName] = useState(suggestedName)
  const [mealType, setMealType] = useState<MealType>(suggestMealType())
  const [time, setTime] = useState(currentTimeHHMM())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleLog() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    // Build a full timestamptz from today's date + the chosen time
    const today = new Date()
    const [hh, mm] = time.split(':').map(Number)
    today.setHours(hh, mm, 0, 0)
    const logged_at = today.toISOString()

    const { error: dbError } = await supabase.from('meals').insert({
      user_id: user?.id ?? null,
      name: name.trim(),
      meal_type: mealType,
      computed_macros: totals,
      logged_at,
    })

    setSaving(false)
    if (dbError) {
      setError(dbError.message)
      return
    }

    const confirmation = `Meal logged! "${name.trim()}" (${mealType}) saved with ${fmt(totals.calories)} kcal, ${fmt(totals.protein_g)} g protein.`
    onLogged(confirmation)
  }

  function handleKeepEditing() {
    setDismissed(true)
    onKeepEditing?.()
  }

  return (
    <div className="w-full max-w-[80%] bg-white border border-gray-200 rounded-xl p-4 text-sm shadow-sm space-y-4">
      <p className="font-semibold text-gray-800 text-base">Log this meal?</p>

      {/* Meal name */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Meal name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Chicken Rice Bowl"
        />
      </div>

      {/* Meal type */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Meal type
        </label>
        <div className="flex gap-2 flex-wrap">
          {MEAL_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMealType(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                mealType === value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Time
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Macro summary */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Macros</p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-700">
          <span className="text-gray-500">Calories</span>
          <span className="col-span-2 font-medium">{fmt(totals.calories)} kcal</span>
          <span className="text-gray-500">Protein</span>
          <span className="col-span-2 font-medium">{fmt(totals.protein_g)} g</span>
          <span className="text-gray-500">Fat</span>
          <span className="col-span-2 font-medium">{fmt(totals.fat_g)} g</span>
          <span className="text-gray-500">Carbs</span>
          <span className="col-span-2 font-medium">{fmt(totals.carbs_g)} g</span>
          <span className="text-gray-500">Fiber</span>
          <span className="col-span-2 font-medium">{fmt(totals.fiber_g)} g</span>
          <span className="text-gray-500">Sugar</span>
          <span className="col-span-2 font-medium">{fmt(totals.sugar_g)} g</span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleLog}
          disabled={saving || !name.trim()}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
        >
          {saving ? 'Saving…' : 'Log Meal'}
        </button>
        <button
          type="button"
          onClick={handleKeepEditing}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          Keep Editing
        </button>
      </div>
    </div>
  )
}
