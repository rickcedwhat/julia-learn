import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { WorkingMealTotals } from '@/lib/gemini'
import MacroCard from '@/components/MacroCard'
import { useUserRules, evaluateRule } from '@/hooks/useUserRules'
import type { UserRule } from '@/hooks/useUserRules'

// ── Types ────────────────────────────────────────────────────────────────────

interface Meal {
  id: string
  user_id: string
  name: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  computed_macros: WorkingMealTotals
  logged_at: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`) // noon local time avoids DST edge cases
  d.setDate(d.getDate() + days)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayBounds(dateStr: string): { start: string; end: string } {
  // Parsed as local time (no tz suffix), then toISOString() gives UTC equivalent
  const start = new Date(`${dateStr}T00:00:00`)
  const end = new Date(`${dateStr}T23:59:59.999`)
  return { start: start.toISOString(), end: end.toISOString() }
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const MEAL_TYPE_STYLES: Record<Meal['meal_type'], { label: string; className: string }> = {
  breakfast: { label: 'Breakfast', className: 'bg-yellow-100 text-yellow-800' },
  lunch:     { label: 'Lunch',     className: 'bg-green-100 text-green-800' },
  dinner:    { label: 'Dinner',    className: 'bg-blue-100 text-blue-800' },
  snack:     { label: 'Snack',     className: 'bg-purple-100 text-purple-800' },
}

function sumMacros(meals: Meal[]): WorkingMealTotals {
  return meals.reduce<WorkingMealTotals>(
    (acc, meal) => ({
      calories:  acc.calories  + (meal.computed_macros?.calories  ?? 0),
      protein_g: acc.protein_g + (meal.computed_macros?.protein_g ?? 0),
      fat_g:     acc.fat_g     + (meal.computed_macros?.fat_g     ?? 0),
      carbs_g:   acc.carbs_g   + (meal.computed_macros?.carbs_g   ?? 0),
      fiber_g:   acc.fiber_g   + (meal.computed_macros?.fiber_g   ?? 0),
      sugar_g:   acc.sugar_g   + (meal.computed_macros?.sugar_g   ?? 0),
    }),
    { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sugar_g: 0 }
  )
}

// ── Rule helpers ──────────────────────────────────────────────────────────────

function getMacroValue(totals: WorkingMealTotals, macro: UserRule['macro']): number {
  switch (macro) {
    case 'calories': return totals.calories
    case 'protein':  return totals.protein_g
    case 'fat':      return totals.fat_g
    case 'carbs':    return totals.carbs_g
    case 'fiber':    return totals.fiber_g
    case 'sugar':    return totals.sugar_g
  }
}

function macroLabel(macro: UserRule['macro']): string {
  const labels: Record<UserRule['macro'], string> = {
    calories: 'Calories', protein: 'Protein', fat: 'Fat',
    carbs: 'Carbs', fiber: 'Fiber', sugar: 'Sugar',
  }
  return labels[macro]
}

function formatRuleTarget(rule: UserRule, calories: number): string {
  if (rule.value_type === 'ratio') {
    const target = calories * rule.value
    return `${target.toFixed(1)} g`
  }
  if (rule.macro === 'calories') return `${rule.value} kcal`
  return `${rule.value} g`
}

function formatMacroActual(macro: UserRule['macro'], totals: WorkingMealTotals): string {
  const val = getMacroValue(totals, macro)
  if (macro === 'calories') return `${val.toFixed(0)} kcal`
  return `${val.toFixed(1)} g`
}

interface PerDayRuleSummaryProps {
  rules: UserRule[]
  totals: WorkingMealTotals
}

function PerDayRuleSummary({ rules, totals }: PerDayRuleSummaryProps) {
  const perDayRules = rules.filter((r) => r.scope === 'per_day')
  if (perDayRules.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">Daily targets</p>
      <div className="divide-y divide-gray-100">
        {perDayRules.map((rule) => {
          const actual = getMacroValue(totals, rule.macro)
          const pass = evaluateRule(rule, actual, totals.calories)
          return (
            <div key={rule.id} className="flex items-center justify-between py-1.5 gap-3">
              <span className="text-gray-600">{macroLabel(rule.macro)}</span>
              <span className="text-gray-400 text-xs">{rule.operator}</span>
              <span className="flex-1 text-gray-500 text-xs">
                {formatRuleTarget(rule, totals.calories)}
              </span>
              <span className="font-medium text-gray-900">
                {formatMacroActual(rule.macro, totals)}
              </span>
              {pass ? (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓</span>
              ) : (
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">✗</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildExportLine(meal: Meal): string {
  const m = meal.computed_macros
  const r = (n: number) => n.toFixed(1)
  const time = formatTime(meal.logged_at)
  return [
    'LOG',
    meal.name,
    time,
    r(m.calories ?? 0),
    r(m.protein_g ?? 0),
    r(m.carbs_g ?? 0),
    r(m.sugar_g ?? 0),
    r(m.fat_g ?? 0),
    r(m.fiber_g ?? 0),
  ].join(' | ')
}

// ── Meal Card ────────────────────────────────────────────────────────────────

interface MealCardProps {
  meal: Meal
  onDelete: (id: string) => void
}

function MealCard({ meal, onDelete }: MealCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const { label, className } = MEAL_TYPE_STYLES[meal.meal_type] ?? {
    label: meal.meal_type,
    className: 'bg-gray-100 text-gray-800',
  }
  const m = meal.computed_macros

  async function handleShare() {
    const line = buildExportLine(meal)
    await navigator.clipboard.writeText(line)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDelete() {
    if (window.confirm(`Delete "${meal.name}"? This cannot be undone.`)) {
      onDelete(meal.id)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Compact row — two-line layout so name never truncates */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${className}`}>
            {label}
          </span>
          <span className="text-xs text-gray-400">{formatTime(meal.logged_at)}</span>
          <span className="ml-auto text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-1.5">
          <span className="font-medium text-gray-900 text-sm leading-snug">{meal.name}</span>
          <span className="text-xs text-gray-500 shrink-0">
            {(m?.calories ?? 0).toFixed(0)} kcal &middot; {(m?.protein_g ?? 0).toFixed(1)}g P
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          <MacroCard totals={m} />
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 text-sm py-1.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700"
            >
              {copied ? 'Copied!' : 'Share'}
            </button>
            <button
              onClick={handleDelete}
              className="text-sm py-1.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Log Page ─────────────────────────────────────────────────────────────────

export default function LogPage() {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { rules } = useUserRules()

  const activeDate = date ?? todayStr()
  const isToday = activeDate === todayStr()

  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  async function fetchMeals() {
    if (!user) return
    setLoading(true)
    const { start, end } = dayBounds(activeDate)
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', start)
      .lte('logged_at', end)
      .order('logged_at', { ascending: true })

    if (error) {
      setFetchError(error.message)
    } else if (data) {
      setMeals(data as Meal[])
      setFetchError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchMeals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate, user])

  async function handleDelete(id: string) {
    await supabase.from('meals').delete().eq('id', id)
    void fetchMeals()
  }

  const totals = sumMacros(meals)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Date header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button
          onClick={() => navigate(`/log/${offsetDate(activeDate, -1)}`)}
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous day"
        >
          ←
        </button>
        <div className="flex flex-col items-center">
          <span className="font-semibold text-gray-900">{formatDate(activeDate)}</span>
          {!isToday && (
            <Link to={`/log/${todayStr()}`} className="text-xs text-blue-500 hover:text-blue-700 mt-0.5">
              Today
            </Link>
          )}
        </div>
        <button
          onClick={() => navigate(`/log/${offsetDate(activeDate, 1)}`)}
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next day"
        >
          →
        </button>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
        {fetchError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
            Could not load meals: {fetchError}
          </div>
        )}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading…</p>
        ) : meals.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-gray-500">No meals logged for this day.</p>
            <Link to="/" className="inline-block text-sm text-blue-500 hover:text-blue-700">
              Go to chat to log a meal →
            </Link>
          </div>
        ) : (
          <>
            {meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onDelete={handleDelete} />
            ))}

            {/* Daily totals */}
            <div className="pt-2 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Daily totals
              </p>
              <MacroCard totals={totals} rules={rules} />
              <PerDayRuleSummary rules={rules} totals={totals} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
