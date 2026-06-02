import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { LabelCategory } from '@/lib/gemini'
import { LABEL_CATEGORIES } from '@/lib/gemini'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Label {
  id: string
  user_id: string
  name: string
  origin: 'ai_estimated' | 'verified_label' | 'user_generated' | 'batch'
  calories: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  fiber_g: number | null
  sugar_g: number | null
  tags: string[]
  meta_tags: string[]
  protected: boolean
  version: number
  created_at: string
  image_url: string | null
  serving_size: string | null
  category: LabelCategory | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN_BADGE: Record<Label['origin'], { label: string; className: string }> = {
  verified_label: { label: 'Scanned', className: 'bg-blue-100 text-blue-800' },
  ai_estimated:   { label: 'AI',      className: 'bg-purple-100 text-purple-800' },
  user_generated: { label: 'Recipe',  className: 'bg-green-100 text-green-800' },
  batch:          { label: 'Batch',   className: 'bg-orange-100 text-orange-800' },
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

function guessMealType(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 20) return 'dinner'
  return 'snack'
}

function fmt(val: number | null | undefined): string {
  return val == null ? '—' : val.toFixed(0)
}

const UNCATEGORIZED = 'Uncategorized'

// ── Library Page ─────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

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
        keys: ['name', 'meta_tags'],
        threshold: 0.4,
        includeScore: true,
      }),
    [labels],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return labels
    return fuse.search(query.trim()).map((r) => r.item)
  }, [query, labels, fuse])

  // Group labels by category (only when not searching)
  const grouped = useMemo(() => {
    if (query.trim()) return null
    const order = [...LABEL_CATEGORIES, UNCATEGORIZED]
    const map = new Map<string, Label[]>()
    for (const label of labels) {
      const key = label.category ?? UNCATEGORIZED
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(label)
    }
    return order.filter((cat) => map.has(cat)).map((cat) => ({ cat, items: map.get(cat)! }))
  }, [labels, query])

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

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
        ) : grouped ? (
          // ── Grouped by category ───────────────────────────────────────────
          grouped.map(({ cat, items }) => {
            const isExpanded = expandedCategories.has(cat)
            const PREVIEW = 3
            const shown = isExpanded ? items : items.slice(0, PREVIEW)
            return (
              <div key={cat}>
                <div className="flex items-center justify-between py-2 px-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat}</span>
                  <span className="text-xs text-gray-400">{items.length}</span>
                </div>
                {shown.map((label) => <LabelRow key={label.id} label={label} navigate={navigate} onDelete={(id) => setLabels((prev) => prev.filter((l) => l.id !== id))} />)}
                {items.length > PREVIEW && (
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="w-full text-xs text-blue-500 hover:text-blue-700 py-1.5 text-center transition-colors"
                  >
                    {isExpanded ? 'Show less' : `Show ${items.length - PREVIEW} more`}
                  </button>
                )}
              </div>
            )
          })
        ) : (
          // ── Flat search results ───────────────────────────────────────────
          filtered.map((label) => <LabelRow key={label.id} label={label} navigate={navigate} onDelete={(id) => setLabels((prev) => prev.filter((l) => l.id !== id))} />)
        )}
      </div>

      {/* Manage mode sticky footer */}
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

// ── Label Row ─────────────────────────────────────────────────────────────────

function LabelRow({
  label,
  navigate,
  onDelete,
}: {
  label: Label
  navigate: ReturnType<typeof useNavigate>
  onDelete: (id: string) => void
}) {
  const { user } = useAuth()
  const badge = ORIGIN_BADGE[label.origin] ?? { label: label.origin, className: 'bg-gray-100 text-gray-700' }

  const [menuOpen, setMenuOpen] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [logMealType, setLogMealType] = useState<MealType>(guessMealType)
  const [logging, setLogging] = useState(false)
  const [loggedConfirm, setLoggedConfirm] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleLogMeal() {
    if (!user) return
    setLogging(true)
    await supabase.from('meals').insert({
      user_id: user.id,
      name: label.name,
      meal_type: logMealType,
      logged_at: new Date().toISOString(),
      computed_macros: {
        calories:  label.calories  ?? 0,
        protein_g: label.protein_g ?? 0,
        fat_g:     label.fat_g     ?? 0,
        carbs_g:   label.carbs_g   ?? 0,
        fiber_g:   label.fiber_g   ?? 0,
        sugar_g:   label.sugar_g   ?? 0,
      },
    })
    setLogging(false)
    setShowLogForm(false)
    setLoggedConfirm(true)
    setTimeout(() => setLoggedConfirm(false), 2500)
  }

  async function handleDelete() {
    setMenuOpen(false)
    if (window.confirm(`Delete "${label.name}"? This cannot be undone.`)) {
      await supabase.from('labels').delete().eq('id', label.id)
      onDelete(label.id)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-stretch">
        {/* Main tappable area → label detail */}
        <button
          type="button"
          onClick={() => navigate(`/library/${label.id}`)}
          className="flex-1 text-left px-4 py-3 hover:bg-gray-50 transition-colors min-w-0"
        >
          <div className="flex items-start gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${badge.className}`}>
              {badge.label}
            </span>
            <span className="font-medium text-gray-900 text-sm leading-snug">{label.name}</span>
            {label.protected && (
              <span className="ml-auto text-xs font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0">
                🔒
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {label.serving_size && <span className="truncate max-w-[120px]">{label.serving_size}</span>}
            <span>{fmt(label.calories)} kcal</span>
            <span>P {fmt(label.protein_g)}g</span>
            <span>C {fmt(label.carbs_g)}g</span>
            <span>F {fmt(label.fat_g)}g</span>
          </div>
          {loggedConfirm && (
            <p className="text-xs text-green-600 mt-1 font-medium">✓ Logged!</p>
          )}
        </button>

        {/* ⋯ menu */}
        <div ref={menuRef} className="relative flex items-center pr-3">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Label actions"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="2.5" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13.5" r="1.5"/>
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); setLogMealType(guessMealType()); setShowLogForm(true) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Log as meal
              </button>
              <button
                onClick={() => { setMenuOpen(false); navigate(`/?label=${label.id}`) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Open in chat
              </button>
              {!label.protected && (
                <>
                  <div className="border-t border-gray-100 mt-1 pt-1" />
                  <button
                    onClick={() => void handleDelete()}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline log-as-meal form */}
      {showLogForm && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center gap-2">
          <select
            value={logMealType}
            onChange={(e) => setLogMealType(e.target.value as MealType)}
            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
          <button
            onClick={() => void handleLogMeal()}
            disabled={logging}
            className="text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors shrink-0"
          >
            {logging ? 'Logging…' : 'Log now'}
          </button>
          <button
            onClick={() => setShowLogForm(false)}
            className="text-sm px-2 py-1.5 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
