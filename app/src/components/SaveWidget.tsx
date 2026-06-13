import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { WorkingMealTotals } from '@/lib/gemini'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

function currentDateYYYYMMDD(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function currentTimeHHMM(): string {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function suggestMealType(): MealType {
  const now = new Date()
  const t = now.getHours() * 60 + now.getMinutes()
  if (t >= 9 * 60 && t < 12 * 60 + 30) return 'breakfast' // 9:00 – 12:30
  if (t >= 12 * 60 + 30 && t < 18 * 60) return 'lunch'    // 12:30 – 18:00
  if (t >= 18 * 60 && t < 23 * 60 + 30) return 'dinner'   // 18:00 – 23:30
  return 'snack'
}

function fmt(val: number | null | undefined): string {
  return val == null ? '—' : val.toFixed(1)
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
  const [date, setDate] = useState(currentDateYYYYMMDD())
  const [time, setTime] = useState(currentTimeHHMM())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleLog() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    // Build a full timestamptz from the chosen date + time (parsed as local time)
    const [hh, mm] = time.split(':').map(Number)
    const logged_at = new Date(`${date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`).toISOString()

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

      {/* Date & Time */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Date &amp; Time
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-sm text-amber-800 font-medium">Failed to save meal</p>
          <p className="text-xs text-amber-700 mt-0.5">{error}</p>
        </div>
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
