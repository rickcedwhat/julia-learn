import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import MacroCard from '@/components/MacroCard'
import TagChips from '@/components/TagChips'
import type { OcrTotals } from '@/lib/gemini'
import { inferMetaTags, inferCategory, LABEL_CATEGORIES } from '@/lib/gemini'
import type { Label } from '@/pages/LibraryPage'
import type { TagKey } from '@/lib/tags'

// ── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN_BADGE: Record<Label['origin'], { label: string; className: string }> = {
  verified_label: { label: 'Scanned', className: 'bg-blue-100 text-blue-800' },
  ai_estimated:   { label: 'AI',      className: 'bg-purple-100 text-purple-800' },
  user_generated: { label: 'Recipe',  className: 'bg-green-100 text-green-800' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ── Detail Page ──────────────────────────────────────────────────────────────

export default function LabelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [label, setLabel] = useState<Label | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // #30 – protect toggle
  const [protecting, setProtecting] = useState(false)

  // #30 – delete flow
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'protected-warn' | 'deleting'>('idle')

  // Fix modal state
  const [fixOpen, setFixOpen] = useState(false)
  const [fixServingSize, setFixServingSize] = useState('')
  const [fixCategory, setFixCategory] = useState('')
  const [inferringCategory, setInferringCategory] = useState(false)
  const [fixingMeta, setFixingMeta] = useState(false)
  const [fixSaving, setFixSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    void (async () => {
      setLoading(true)
      const { data, error: dbError } = await supabase
        .from('labels')
        .select('*')
        .eq('id', id)
        .single()

      if (dbError) {
        setError(dbError.message)
      } else {
        setLabel(data as Label)
      }
      setLoading(false)
    })()
  }, [id])

  function handleUseInMeal() {
    navigate(`/?label=${id}`)
  }

  async function handleToggleProtect() {
    if (!label) return
    setProtecting(true)
    const { error: dbError } = await supabase
      .from('labels')
      .update({ protected: !label.protected })
      .eq('id', label.id)
    setProtecting(false)
    if (!dbError) {
      setLabel((prev) => prev ? { ...prev, protected: !prev.protected } : prev)
    }
  }

  function handleDeleteClick() {
    if (!label) return
    if (label.protected) {
      setDeleteState('protected-warn')
    } else {
      setDeleteState('confirm')
    }
  }

  async function handleDelete() {
    if (!label) return
    setDeleteState('deleting')
    const { error: dbError } = await supabase.from('labels').delete().eq('id', label.id)
    if (!dbError) {
      navigate('/library')
    } else {
      setDeleteState('idle')
    }
  }

  function openFix() {
    if (!label) return
    setFixServingSize(label.serving_size ?? '')
    setFixCategory(label.category ?? '')
    setFixOpen(true)
  }

  async function handleInferCategory() {
    if (!label) return
    setInferringCategory(true)
    const cat = await inferCategory(label.name)
    setInferringCategory(false)
    if (cat) setFixCategory(cat)
  }

  async function handleRegenerateMetaTags() {
    if (!label) return
    setFixingMeta(true)
    const metaTags = await inferMetaTags(label.name)
    const { error: dbError } = await supabase
      .from('labels')
      .update({ meta_tags: metaTags })
      .eq('id', label.id)
    setFixingMeta(false)
    if (!dbError) {
      setLabel((prev) => prev ? { ...prev, meta_tags: metaTags } : prev)
    }
  }

  async function handleSaveFix() {
    if (!label) return
    setFixSaving(true)
    const trimmed = fixServingSize.trim() || null
    const cat = (fixCategory as string) || null
    const { error: dbError } = await supabase
      .from('labels')
      .update({ serving_size: trimmed, category: cat })
      .eq('id', label.id)
    setFixSaving(false)
    if (!dbError) {
      setLabel((prev) => prev ? { ...prev, serving_size: trimmed, category: cat as Label['category'] } : prev)
      setFixOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (error || !label) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error ?? 'Label not found.'}</p>
        <Link to="/library" className="text-sm text-blue-500 hover:text-blue-700">
          ← Back to Library
        </Link>
      </div>
    )
  }

  const badge = ORIGIN_BADGE[label.origin] ?? {
    label: label.origin,
    className: 'bg-gray-100 text-gray-700',
  }

  // Use OcrTotals (nullable) so MacroCard shows — for any unreadable fields
  const totals: OcrTotals = {
    calories:  label.calories,
    protein_g: label.protein_g,
    fat_g:     label.fat_g,
    carbs_g:   label.carbs_g,
    fiber_g:   label.fiber_g,
    sugar_g:   label.sugar_g,
  }

  const isIncomplete = !label.serving_size || label.meta_tags.length === 0 || !label.category

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Back link */}
        <Link
          to="/library"
          className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
        >
          ← Back to Library
        </Link>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">{label.name}</h1>
            {isIncomplete && (
              <button
                type="button"
                onClick={openFix}
                className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors shrink-0"
              >
                Incomplete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
            {label.version > 1 && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                v{label.version}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDate(label.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {label.serving_size && (
              <p className="text-sm text-gray-500">Serving: {label.serving_size}</p>
            )}
            {label.category && (
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {label.category}
              </span>
            )}
          </div>
        </div>

        {/* Source image thumbnail (only present for OCR-scanned labels) */}
        {label.image_url && (
          <img
            src={label.image_url}
            alt="Nutrition label"
            className="w-full max-h-52 object-cover rounded-xl border border-gray-200"
          />
        )}

        {/* Macro card */}
        <MacroCard totals={totals} />

        {/* Tag chips from stored tags */}
        <TagChips tags={(label.tags ?? []) as TagKey[]} />

        {/* Actions */}
        <button
          type="button"
          onClick={handleUseInMeal}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
        >
          Use in meal
        </button>

        {/* #30 – Protect toggle */}
        <button
          type="button"
          onClick={handleToggleProtect}
          disabled={protecting}
          className={
            label.protected
              ? 'w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-60'
              : 'w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-60'
          }
        >
          {label.protected ? '🔒 Protected' : '🔓 Protect this label'}
        </button>

        {/* #30 – Delete section */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          {deleteState === 'idle' && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="w-full border border-red-200 text-red-500 hover:bg-red-50 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Delete label
            </button>
          )}

          {deleteState === 'confirm' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center">
                Are you sure? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteState('idle')}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  No, cancel
                </button>
              </div>
            </div>
          )}

          {deleteState === 'protected-warn' && (
            <div className="space-y-2">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                This label is protected. Unprotect it first before deleting.
              </p>
              <button
                type="button"
                onClick={() => setDeleteState('idle')}
                className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {deleteState === 'deleting' && (
            <p className="text-sm text-gray-400 text-center py-2">Deleting…</p>
          )}
        </div>
      </div>

      {/* Fix / complete data modal */}
      {fixOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setFixOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-lg p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 text-base">Complete label data</h2>

            {/* Serving size */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Serving size
              </label>
              <input
                type="text"
                value={fixServingSize}
                onChange={(e) => setFixServingSize(e.target.value)}
                placeholder='e.g. "4 pieces (140g)" or "1 cup (240ml)"'
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Category</label>
                <button
                  type="button"
                  onClick={() => void handleInferCategory()}
                  disabled={inferringCategory}
                  className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
                >
                  {inferringCategory ? 'Inferring…' : 'Auto-detect'}
                </button>
              </div>
              <select
                value={fixCategory}
                onChange={(e) => setFixCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None —</option>
                {LABEL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Meta-tags */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Search tags</span>
                {label.meta_tags.length > 0 && (
                  <span className="text-xs text-gray-400">{label.meta_tags.join(', ')}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleRegenerateMetaTags()}
                disabled={fixingMeta}
                className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
              >
                {fixingMeta ? 'Generating…' : label.meta_tags.length === 0 ? 'Generate search tags' : 'Regenerate search tags'}
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFixOpen(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveFix()}
                disabled={fixSaving}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-60"
              >
                {fixSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
