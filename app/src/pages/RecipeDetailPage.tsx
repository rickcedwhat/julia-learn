import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

interface Recipe {
  id: string
  user_id: string
  name: string
  notes: string | null
  created_at: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ── Recipe Detail Page ────────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Inline edit state for name
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Inline edit state for notes
  const [editingNotes, setEditingNotes] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!id) return
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()
      if (!cancelled) {
        if (error) {
          setLoadError(error.message)
        } else {
          setRecipe(data as Recipe)
        }
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSaveName() {
    if (!recipe) return
    if (!editName.trim()) {
      setNameError('Name is required')
      return
    }
    setSavingName(true)
    setNameError(null)
    const { error } = await supabase
      .from('recipes')
      .update({ name: editName.trim() })
      .eq('id', recipe.id)
    setSavingName(false)
    if (error) {
      setNameError(error.message)
      return
    }
    setRecipe((prev) => (prev ? { ...prev, name: editName.trim() } : prev))
    setEditingName(false)
  }

  async function handleSaveNotes() {
    if (!recipe) return
    setSavingNotes(true)
    setNotesError(null)
    const { error } = await supabase
      .from('recipes')
      .update({ notes: editNotes.trim() || null })
      .eq('id', recipe.id)
    setSavingNotes(false)
    if (error) {
      setNotesError(error.message)
      return
    }
    setRecipe((prev) => (prev ? { ...prev, notes: editNotes.trim() || null } : prev))
    setEditingNotes(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (loadError || !recipe) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{loadError ?? 'Recipe not found.'}</p>
        <Link to="/recipes" className="text-sm text-blue-500 hover:text-blue-700">
          ← Recipes
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          to="/recipes"
          className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
        >
          ← Recipes
        </Link>

        {/* Name */}
        <div className="space-y-1">
          {editingName ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                className="w-full text-2xl font-semibold text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {nameError && <p className="text-xs text-red-600">{nameError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleSaveName()}
                  disabled={savingName}
                  className="text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false)
                    setNameError(null)
                  }}
                  className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditName(recipe.name)
                setEditingName(true)
                setNameError(null)
              }}
              className="group w-full text-left"
              title="Click to edit name"
            >
              <h1 className="text-2xl font-semibold text-gray-900 group-hover:text-gray-600 transition-colors">
                {recipe.name}
              </h1>
            </button>
          )}
          <p className="text-xs text-gray-400">{formatDate(recipe.created_at)}</p>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                autoFocus
                rows={4}
                placeholder="Add notes…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {notesError && <p className="text-xs text-red-600">{notesError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleSaveNotes()}
                  disabled={savingNotes}
                  className="text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {savingNotes ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingNotes(false)
                    setNotesError(null)
                  }}
                  className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditNotes(recipe.notes ?? '')
                setEditingNotes(true)
                setNotesError(null)
              }}
              className="group w-full text-left"
              title="Click to edit notes"
            >
              {recipe.notes ? (
                <p className="text-sm text-gray-700 group-hover:text-gray-500 transition-colors whitespace-pre-wrap">
                  {recipe.notes}
                </p>
              ) : (
                <p className="text-sm text-gray-400 group-hover:text-gray-500 transition-colors italic">
                  No notes. Click to add…
                </p>
              )}
            </button>
          )}
        </div>

        {/* Batches section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Batches</p>
          <div className="border border-gray-200 rounded-xl p-4 space-y-1">
            <p className="text-sm text-gray-500">No batches yet.</p>
            <p className="text-xs text-gray-400">(Batches coming in the next update)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
