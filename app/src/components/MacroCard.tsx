import type { WorkingMealTotals } from '@/lib/gemini'

interface Props {
  totals: WorkingMealTotals
}

function fmt(val: number | null | undefined): string {
  return val == null ? '—' : val.toFixed(1)
}

interface Row {
  label: string
  value: string
  badge?: 'pass' | 'fail'
}

export default function MacroCard({ totals }: Props) {
  const proteinPass = totals.protein_g >= totals.calories * 0.05
  const fiberPass = totals.fiber_g >= totals.calories * 0.015

  const rows: Row[] = [
    { label: 'Calories', value: fmt(totals.calories) + ' kcal' },
    {
      label: 'Protein',
      value: fmt(totals.protein_g) + ' g',
      badge: totals.calories > 0 ? (proteinPass ? 'pass' : 'fail') : undefined,
    },
    { label: 'Fat', value: fmt(totals.fat_g) + ' g' },
    { label: 'Total Carbs', value: fmt(totals.carbs_g) + ' g' },
    {
      label: 'Fiber',
      value: fmt(totals.fiber_g) + ' g',
      badge: totals.calories > 0 ? (fiberPass ? 'pass' : 'fail') : undefined,
    },
    { label: 'Sugar', value: fmt(totals.sugar_g) + ' g' },
  ]

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
    </div>
  )
}
