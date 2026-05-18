import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Macro = 'calories' | 'protein' | 'fat' | 'carbs' | 'fiber' | 'sugar'
export type Scope = 'per_meal' | 'per_day'
export type Operator = '<=' | '>=' | '='
export type ValueType = 'absolute' | 'ratio'

export interface UserRule {
  id: string
  user_id: string
  macro: Macro
  scope: Scope
  operator: Operator
  value: number
  value_type: ValueType
  active: boolean
  created_at: string
}

// ── Default seed rules ────────────────────────────────────────────────────────

type NewRule = Omit<UserRule, 'id' | 'user_id' | 'created_at' | 'active'>

export const DEFAULT_RULES: NewRule[] = [
  { macro: 'protein', scope: 'per_meal', operator: '>=', value: 0.05,  value_type: 'ratio' },
  { macro: 'fiber',   scope: 'per_meal', operator: '>=', value: 0.015, value_type: 'ratio' },
  { macro: 'calories', scope: 'per_day', operator: '<=', value: 2000,  value_type: 'absolute' },
  { macro: 'protein',  scope: 'per_day', operator: '>=', value: 100,   value_type: 'absolute' },
  { macro: 'fiber',    scope: 'per_day', operator: '>=', value: 25,    value_type: 'absolute' },
]

// ── Evaluation helper ─────────────────────────────────────────────────────────

export function evaluateRule(rule: UserRule, macroValue: number, calories: number): boolean {
  const target = rule.value_type === 'ratio' ? calories * rule.value : rule.value
  if (rule.operator === '>=') return macroValue >= target
  if (rule.operator === '<=') return macroValue <= target
  return macroValue === target
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseUserRulesResult {
  rules: UserRule[]
  allRules: UserRule[]
  loading: boolean
  refetch: () => void
}

export function useUserRules(): UseUserRulesResult {
  const { user } = useAuth()
  const [rules, setRules] = useState<UserRule[]>([])
  const [allRules, setAllRules] = useState<UserRule[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  function refetch() {
    setTick((t) => t + 1)
  }

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)

      // Fetch all rules (for settings page)
      const { data: allData } = await supabase
        .from('user_rules')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })

      if (cancelled) return

      const fetchedAll = (allData ?? []) as UserRule[]

      // Seed defaults if user has no rules at all
      if (fetchedAll.length === 0) {
        const toInsert = DEFAULT_RULES.map((r) => ({
          ...r,
          user_id: user!.id,
          active: true,
        }))
        const { data: seeded } = await supabase
          .from('user_rules')
          .insert(toInsert)
          .select()
        if (!cancelled) {
          const seededRules = (seeded ?? []) as UserRule[]
          setAllRules(seededRules)
          setRules(seededRules.filter((r) => r.active))
        }
      } else {
        if (!cancelled) {
          setAllRules(fetchedAll)
          setRules(fetchedAll.filter((r) => r.active))
        }
      }

      if (!cancelled) setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [user, tick])

  return { rules, allRules, loading, refetch }
}
