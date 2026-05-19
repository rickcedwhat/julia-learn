export type TagKey =
  | 'high_protein'
  | 'high_fiber'
  | 'low_fat'
  | 'calorie_dense'
  | 'low_calorie'

export const TAG_META: Record<TagKey, { label: string; emoji: string; tw: string }> = {
  high_protein:  { label: 'High Protein',  emoji: '🏋️', tw: 'text-blue-600 bg-blue-50'  },
  high_fiber:    { label: 'High Fiber',    emoji: '🌾', tw: 'text-green-600 bg-green-50' },
  low_fat:       { label: 'Low Fat',       emoji: '✨', tw: 'text-teal-600 bg-teal-50'   },
  calorie_dense: { label: 'Calorie Dense', emoji: '⚡', tw: 'text-amber-600 bg-amber-50' },
  low_calorie:   { label: 'Low Calorie',   emoji: '🥗', tw: 'text-lime-600 bg-lime-50'   },
}

export const MAX_TAGS = 3

interface MacroSnapshot {
  calories: number | null | undefined
  protein_g: number | null | undefined
  fat_g: number | null | undefined
  fiber_g: number | null | undefined
  // serving_weight_g omitted for now (needed for calorie_dense / low_calorie)
}

/** Returns up to MAX_TAGS math-derived tag keys for a given macro snapshot. */
export function computeMathTags(m: MacroSnapshot): TagKey[] {
  const cal = m.calories ?? 0
  if (cal <= 0) return []
  const tags: TagKey[] = []
  if ((m.protein_g ?? 0) >= cal * 0.05)  tags.push('high_protein')
  if ((m.fiber_g   ?? 0) >= cal * 0.015) tags.push('high_fiber')
  if ((m.fat_g     ?? 0) <= cal * 0.03)  tags.push('low_fat')
  return tags.slice(0, MAX_TAGS)
}
