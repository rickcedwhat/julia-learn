import { useEffect, useState, useMemo } from 'react'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Label {
  id: string
  name: string
  origin: 'ai_estimated' | 'verified_label' | 'user_generated'
  calories: number | null
  protein_g: number | null
  serving_size: string | null
  meta_tags: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (labelId: string, labelName: string) => void
  /** Current meal component names — used to rank relevant labels to the top. */
  mealComponentNames?: string[]
  /** IDs of labels already in the context tray — hidden from the list. */
  contextLabelIds?: string[]
}

const ORIGIN_BADGE: Record<Label['origin'], { label: string; className: string }> = {
  verified_label: { label: 'Scanned', className: 'bg-blue-100 text-blue-800' },
  ai_estimated:   { label: 'AI',      className: 'bg-purple-100 text-purple-800' },
  user_generated: { label: 'Recipe',  className: 'bg-green-100 text-green-800' },
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter((t) => t.length > 2)
}

function relevanceScore(label: Label, mealTokens: Set<string>): number {
  if (mealTokens.size === 0) return 0
  const labelTokens = tokenize([label.name, ...label.meta_tags].join(' '))
  let score = 0
  for (const t of labelTokens) {
    if (mealTokens.has(t)) score++
  }
  return score
}

export default function LabelSearchPanel({
  open,
  onClose,
  onSelect,
  mealComponentNames = [],
  contextLabelIds = [],
}: Props) {
  const { user } = useAuth()
  const [labels, setLabels] = useState<Label[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('labels')
        .select('id, name, origin, calories, protein_g, serving_size, meta_tags')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!cancelled) setLabels((data as Label[]) ?? [])
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id])

  // Reset query when panel closes
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const contextIdSet = useMemo(() => new Set(contextLabelIds), [contextLabelIds])

  // Remove already-in-context labels, then sort by relevance to current meal
  const mealTokens = useMemo(
    () => new Set(tokenize(mealComponentNames.join(' '))),
    [mealComponentNames],
  )

  const available = useMemo(() => {
    const filtered = labels.filter((l) => !contextIdSet.has(l.id))
    if (mealTokens.size === 0) return filtered
    return [...filtered].sort(
      (a, b) => relevanceScore(b, mealTokens) - relevanceScore(a, mealTokens),
    )
  }, [labels, contextIdSet, mealTokens])

  const fuse = useMemo(
    () => new Fuse(available, { keys: ['name', 'meta_tags'], threshold: 0.4 }),
    [available],
  )

  const results = useMemo(
    () => (query.trim() ? fuse.search(query.trim()).map((r) => r.item) : available),
    [query, available, fuse],
  )

  if (!open) return null

  return (
    <div className="border-t border-gray-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">Library</span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close library panel"
        >
          ×
        </button>
      </div>

      {/* Search input */}
      <div className="px-4 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search labels…"
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Results */}
      <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
        {results.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            {labels.length === 0 ? 'No labels saved yet.' : 'No matches.'}
          </p>
        ) : (
          results.map((label) => {
            const badge = ORIGIN_BADGE[label.origin] ?? {
              label: label.origin,
              className: 'bg-gray-100 text-gray-700',
            }
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => { onSelect(label.id, label.name); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}
                >
                  {badge.label}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate block">{label.name}</span>
                  {label.serving_size && (
                    <span className="text-xs text-gray-400 truncate block">{label.serving_size}</span>
                  )}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {label.calories ?? '—'} kcal · {label.protein_g ?? '—'} g
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
