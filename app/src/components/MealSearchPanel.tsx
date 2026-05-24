import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { WorkingMealTotals } from '@/lib/gemini'

interface Meal {
  id: string
  name: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  computed_macros: WorkingMealTotals
  logged_at: string
}

interface Props {
  open: boolean
  onClose: () => void
}

const MEAL_TYPE_STYLES: Record<Meal['meal_type'], { label: string; className: string }> = {
  breakfast: { label: 'Breakfast', className: 'bg-yellow-100 text-yellow-800' },
  lunch:     { label: 'Lunch',     className: 'bg-green-100 text-green-800' },
  dinner:    { label: 'Dinner',    className: 'bg-blue-100 text-blue-800' },
  snack:     { label: 'Snack',     className: 'bg-purple-100 text-purple-800' },
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 864e5).toDateString()
  if (d.toDateString() === today) return 'Today'
  if (d.toDateString() === yesterday) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MealSearchPanel({ open, onClose }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [relogging, setRelogging] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      const { data } = await supabase
        .from('meals')
        .select('id, name, meal_type, computed_macros, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(200)
      if (!cancelled) {
        setMeals((data as Meal[]) ?? [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const fuse = useMemo(
    () => new Fuse(meals, { keys: ['name'], threshold: 0.4 }),
    [meals],
  )

  const results = useMemo(
    () => (query.trim() ? fuse.search(query.trim()).map((r) => r.item) : meals),
    [query, meals, fuse],
  )

  async function handleReLog(meal: Meal) {
    if (!user) return
    setRelogging(meal.id)
    await supabase.from('meals').insert({
      user_id: user.id,
      name: meal.name,
      meal_type: meal.meal_type,
      computed_macros: meal.computed_macros,
      logged_at: new Date().toISOString(),
    })
    setRelogging(null)
    onClose()
  }

  function handleOpenInChat(meal: Meal) {
    navigate(`/?meal=${meal.id}`)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          aria-label="Close"
        >
          ←
        </button>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search past meals…"
          autoFocus
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            {meals.length === 0 ? 'No meals logged yet.' : 'No matches.'}
          </p>
        ) : (
          results.map((meal) => {
            const style = MEAL_TYPE_STYLES[meal.meal_type] ?? { label: meal.meal_type, className: 'bg-gray-100 text-gray-700' }
            const m = meal.computed_macros
            return (
              <div key={meal.id} className="border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${style.className}`}>
                    {style.label}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(meal.logged_at)}</span>
                </div>
                <p className="font-medium text-gray-900 text-sm mb-1">{meal.name}</p>
                <p className="text-xs text-gray-400 mb-2">
                  {(m?.calories ?? 0).toFixed(0)} kcal &middot; {(m?.protein_g ?? 0).toFixed(1)}g P
                  &middot; {(m?.carbs_g ?? 0).toFixed(1)}g C &middot; {(m?.fat_g ?? 0).toFixed(1)}g F
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={relogging === meal.id}
                    onClick={() => void handleReLog(meal)}
                    className="text-xs font-medium bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {relogging === meal.id ? 'Logging…' : 'Log again'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenInChat(meal)}
                    className="text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Open in chat
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
