import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useUserRules } from '@/hooks/useUserRules'
import type { Macro, Scope, Operator, ValueType, UserRule } from '@/hooks/useUserRules'

// ── Constants ─────────────────────────────────────────────────────────────────

const MACROS: { value: Macro; label: string }[] = [
  { value: 'calories', label: 'Calories' },
  { value: 'protein',  label: 'Protein'  },
  { value: 'fat',      label: 'Fat'      },
  { value: 'carbs',    label: 'Carbs'    },
  { value: 'fiber',    label: 'Fiber'    },
  { value: 'sugar',    label: 'Sugar'    },
]

function formatValue(rule: UserRule): string {
  if (rule.value_type === 'ratio') {
    return `${(rule.value * 100).toFixed(1)}% × cal`
  }
  if (rule.macro === 'calories') {
    return `${rule.value} kcal`
  }
  return `${rule.value} g`
}

function macroLabel(macro: Macro): string {
  return MACROS.find((m) => m.value === macro)?.label ?? macro
}

// ── Rule Row ──────────────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: UserRule
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
}

function RuleRow({ rule, onToggle, onDelete }: RuleRowProps) {
  return (
    <div className={`flex items-center justify-between py-2 gap-3 ${!rule.active ? 'opacity-40' : ''}`}>
      <span className="text-sm font-medium text-gray-800 w-20 shrink-0">{macroLabel(rule.macro)}</span>
      <span className="text-sm text-gray-500 shrink-0">{rule.operator}</span>
      <span className="text-sm text-gray-700 flex-1">{formatValue(rule)}</span>
      <div className="flex items-center gap-2 shrink-0">
        {/* Toggle */}
        <button
          onClick={() => onToggle(rule.id, !rule.active)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
            rule.active ? 'bg-blue-500' : 'bg-gray-300'
          }`}
          aria-label={rule.active ? 'Deactivate rule' : 'Activate rule'}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              rule.active ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
        {/* Delete */}
        <button
          onClick={() => onDelete(rule.id)}
          className="text-gray-400 hover:text-red-500 transition-colors text-base leading-none"
          aria-label="Delete rule"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ── Add Rule Form ─────────────────────────────────────────────────────────────

interface AddRuleFormProps {
  defaultScope: Scope
  userId: string
  onSaved: () => void
}

function AddRuleForm({ defaultScope, userId, onSaved }: AddRuleFormProps) {
  const [macro, setMacro]         = useState<Macro>('protein')
  const [scope, setScope]         = useState<Scope>(defaultScope)
  const [operator, setOperator]   = useState<Operator>('>=')
  const [value, setValue]         = useState('')
  const [valueType, setValueType] = useState<ValueType>('absolute')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Reset value_type when macro changes to calories (ratio not allowed)
  function handleMacroChange(m: Macro) {
    setMacro(m)
    if (m === 'calories' && valueType === 'ratio') {
      setValueType('absolute')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) {
      setError('Enter a valid number')
      return
    }
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase.from('user_rules').insert({
      user_id:    userId,
      macro,
      scope,
      operator,
      value:      num,
      value_type: valueType,
      active:     true,
    })
    setSaving(false)
    if (dbError) {
      setError(dbError.message)
    } else {
      setValue('')
      onSaved()
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="border-t border-gray-100 pt-4 mt-2 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add rule</p>

      {/* Macro */}
      <div className="flex flex-wrap gap-1.5">
        {MACROS.map(({ value: m, label }) => (
          <button
            key={m}
            type="button"
            onClick={() => handleMacroChange(m)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              macro === m
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Scope */}
      <div className="flex gap-2">
        {(['per_meal', 'per_day'] as Scope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
              scope === s
                ? 'bg-gray-800 text-white border-gray-800'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {s === 'per_meal' ? 'Per Meal' : 'Per Day'}
          </button>
        ))}
      </div>

      {/* Operator + Value */}
      <div className="flex gap-2 items-center">
        <div className="flex gap-1">
          {(['>=', '<=', '='] as Operator[]).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setOperator(op)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors font-mono ${
                operator === op
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {op === '>=' ? '≥' : op === '<=' ? '≤' : '='}
            </button>
          ))}
        </div>
        <input
          type="number"
          step="any"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value"
          required
          className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Value type */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setValueType('absolute')}
          className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
            valueType === 'absolute'
              ? 'bg-gray-800 text-white border-gray-800'
              : 'border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          Absolute (g / kcal)
        </button>
        {macro !== 'calories' && (
          <button
            type="button"
            onClick={() => setValueType('ratio')}
            className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
              valueType === 'ratio'
                ? 'bg-gray-800 text-white border-gray-800'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            × Calories (ratio)
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving || !value}
        className="w-full text-sm py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
      >
        {saving ? 'Saving…' : 'Add rule'}
      </button>
    </form>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string
  scope: Scope
  rules: UserRule[]
  userId: string
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onSaved: () => void
}

function Section({ title, scope, rules, userId, onToggle, onDelete, onSaved }: SectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-1">
      <p className="text-sm font-semibold text-gray-800 mb-2">{title}</p>
      {rules.length === 0 && (
        <p className="text-xs text-gray-400 py-1">No rules yet.</p>
      )}
      <div className="divide-y divide-gray-100">
        {rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>
      <AddRuleForm defaultScope={scope} userId={userId} onSaved={onSaved} />
    </div>
  )
}

// ── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth()
  const { allRules, loading, refetch } = useUserRules()

  async function handleToggle(id: string, active: boolean) {
    await supabase.from('user_rules').update({ active }).eq('id', id)
    refetch()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this rule?')) return
    await supabase.from('user_rules').delete().eq('id', id)
    refetch()
  }

  const perMealRules = allRules.filter((r) => r.scope === 'per_meal')
  const perDayRules  = allRules.filter((r) => r.scope === 'per_day')

  if (!user) return null

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your macro targets and rules.</p>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <>
            <Section
              title="Per Meal"
              scope="per_meal"
              rules={perMealRules}
              userId={user.id}
              onToggle={(id, active) => void handleToggle(id, active)}
              onDelete={(id) => void handleDelete(id)}
              onSaved={refetch}
            />
            <Section
              title="Per Day"
              scope="per_day"
              rules={perDayRules}
              userId={user.id}
              onToggle={(id, active) => void handleToggle(id, active)}
              onDelete={(id) => void handleDelete(id)}
              onSaved={refetch}
            />
          </>
        )}

        <p className="text-xs text-gray-400 text-center pt-2">v{__APP_VERSION__}</p>
      </div>
    </div>
  )
}
