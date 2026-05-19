import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import TagChips from '@/components/TagChips'
import type { TagKey } from '@/lib/tags'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Label {
  id: string
  user_id: string
  name: string
  origin: 'ai_estimated' | 'verified_label' | 'user_generated'
  calories: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  fiber_g: number | null
  sugar_g: number | null
  tags: string[]
  protected: boolean
  version: number
  created_at: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN_BADGE: Record<Label['origin'], { label: string; className: string }> = {
  verified_label: { label: 'Scanned', className: 'bg-blue-100 text-blue-800' },
  ai_estimated:   { label: 'AI',      className: 'bg-purple-100 text-purple-800' },
  user_generated: { label: 'Recipe',  className: 'bg-green-100 text-green-800' },
}

function fmt(val: number | null | undefined): string {
  return val == null ? '—' : val.toFixed(0)
}

// ── Library Page ─────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  // #31 – manage mode state
  const [manageMode, setManageMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!cancelled) {
        if (!error && data) {
          setLabels(data as Label[])
        }
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  const fuse = useMemo(
    () =>
      new Fuse(labels, {
        keys: ['name'],
        threshold: 0.4,
        includeScore: true,
      }),
    [labels],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return labels
    return fuse.search(query.trim()).map((r) => r.item)
  }, [query, labels, fuse])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function enterManageMode() {
    setManageMode(true)
    setSelectedIds(new Set())
    setDeleteConfirm(false)
  }

  function exitManageMode() {
    setManageMode(false)
    setSelectedIds(new Set())
    setDeleteConfirm(false)
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return
    setDeleting(true)
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from('labels').delete().in('id', ids)
    setDeleting(false)
    if (!error) {
      setLabels((prev) => prev.filter((l) => !selectedIds.has(l.id)))
      exitManageMode()
    }
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Search bar / manage bar */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-gray-100">
        {manageMode ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Select labels to delete</span>
            <button
              type="button"
              onClick={exitManageMode}
              className="text-sm text-blue-500 hover:text-blue-700 font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search labels…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={enterManageMode}
              className="shrink-0 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              Manage
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-2">
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading…</p>
        ) : labels.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-gray-500">No labels saved yet.</p>
            <p className="text-sm text-gray-400">
              Scan a nutrition label or chat to get started.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No labels match &ldquo;{query}&rdquo;</p>
        ) : manageMode ? (
          // ── Manage mode rows ──────────────────────────────────────────────
          labels.map((label) => {
            const isProtected = label.protected
            const isSelected = selectedIds.has(label.id)
            const badge = ORIGIN_BADGE[label.origin] ?? {
              label: label.origin,
              className: 'bg-gray-100 text-gray-700',
            }
            return (
              <div
                key={label.id}
                className={`flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl ${isProtected ? 'opacity-60' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isProtected}
                  onChange={() => toggleSelect(label.id)}
                  className="w-4 h-4 accent-red-500 shrink-0 disabled:cursor-not-allowed"
                />

                {/* Origin badge */}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}
                >
                  {badge.label}
                </span>

                {/* Name */}
                <span className="flex-1 font-medium text-gray-900 truncate">
                  {label.name}
                </span>

                {/* Protected chip */}
                {isProtected && (
                  <span className="text-xs font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0">
                    🔒 Protected
                  </span>
                )}
              </div>
            )
          })
        ) : (
          // ── Normal list rows ──────────────────────────────────────────────
          filtered.map((label) => {
            const badge = ORIGIN_BADGE[label.origin] ?? {
              label: label.origin,
              className: 'bg-gray-100 text-gray-700',
            }
            return (
              <button
                key={label.id}
                onClick={() => navigate(`/library/${label.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-left hover:bg-gray-50 transition-colors"
              >
                {/* Origin badge */}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}
                >
                  {badge.label}
                </span>

                {/* Name + tags */}
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-gray-900 truncate">{label.name}</span>
                  {label.tags.length > 0 && (
                    <TagChips tags={label.tags as TagKey[]} />
                  )}
                </span>

                {/* Version badge (only when > 1) */}
                {label.version > 1 && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                    v{label.version}
                  </span>
                )}

                {/* Macros summary */}
                <span className="text-sm text-gray-500 shrink-0">
                  {fmt(label.calories)} kcal &middot; {fmt(label.protein_g)} g protein
                </span>

                {/* Protected icon */}
                {label.protected && (
                  <span className="text-sm shrink-0" aria-label="Protected">🔒</span>
                )}

                <span className="text-gray-400 text-sm ml-1">›</span>
              </button>
            )
          })
        )}
      </div>

      {/* #31 – Sticky footer for manage mode */}
      {manageMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-20">
          <div className="max-w-2xl mx-auto space-y-2">
            {!deleteConfirm ? (
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm text-gray-600">
                  {selectedIds.size} selected
                </span>
                <button
                  type="button"
                  onClick={exitManageMode}
                  className="text-sm font-medium text-gray-600 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  Done
                </button>
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={() => setDeleteConfirm(true)}
                  className="text-sm font-medium bg-red-500 hover:bg-red-600 disabled:bg-red-200 text-white rounded-lg px-4 py-2 transition-colors"
                >
                  Delete selected
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 text-center">
                  Delete {selectedIds.size} label{selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchDelete}
                    disabled={deleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
                  >
                    {deleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
