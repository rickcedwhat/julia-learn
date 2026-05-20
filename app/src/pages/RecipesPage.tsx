import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

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
    month: 'short',
    day: 'numeric',
  })
}

// ── Recipes Page ──────────────────────────────────────────────────────────────

export default function RecipesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createNotes, setCreateNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete state
  const [deleteWarningId, setDeleteWarningId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!user) return
      const { data } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setRecipes((data as Recipe[]) ?? [])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim()) {
      setCreateError('Name is required')
      return
    }
    setCreating(true)
    setCreateError(null)
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user?.id,
        name: createName.trim(),
        notes: createNotes.trim() || null,
      })
      .select()
      .single()
    setCreating(false)
    if (error) {
      setCreateError(error.message)
      return
    }
    setRecipes((prev) => [data as Recipe, ...prev])
    setCreateName('')
    setCreateNotes('')
    setShowCreateForm(false)
  }

  function startEdit(recipe: Recipe) {
    setEditingId(recipe.id)
    setEditName(recipe.name)
    setEditNotes(recipe.notes ?? '')
    setEditError(null)
    setDeleteWarningId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) {
      setEditError('Name is required')
      return
    }
    setSaving(true)
    setEditError(null)
    const { error } = await supabase
      .from('recipes')
      .update({ name: editName.trim(), notes: editNotes.trim() || null })
      .eq('id', id)
    setSaving(false)
    if (error) {
      setEditError(error.message)
      return
    }
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, name: editName.trim(), notes: editNotes.trim() || null } : r,
      ),
    )
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    // Check for batches
    const { count } = await supabase
      .from('batches')
      .select('id', { count: 'exact', head: true })
      .eq('recipe_id', id)
    if ((count ?? 0) > 0) {
      setDeleteWarningId(id)
      setDeleting(false)
      return
    }
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    setDeleting(false)
    if (!error) {
      setRecipes((prev) => prev.filter((r) => r.id !== id))
      if (editingId === id) setEditingId(null)
    }
  }

  if (!user) return null

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Recipes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your saved recipes.</p>
          </div>
          {!showCreateForm && (
            <button
              onClick={() => {
                setShowCreateForm(true)
                setCreateError(null)
              }}
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
            >
              New Recipe
            </button>
          )}
        </div>

        {/* Create form */}
        {showCreateForm && (
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50"
          >
            <p className="text-sm font-semibold text-gray-700">New Recipe</p>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Recipe name"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {createError && <p className="text-xs text-red-600">{createError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 text-sm py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setCreateName('')
                  setCreateNotes('')
                  setCreateError(null)
                }}
                className="flex-1 text-sm py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* List */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading…</p>
        ) : recipes.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No recipes yet. Create your first recipe above.
          </p>
        ) : (
          <div className="space-y-2">
            {recipes.map((recipe) => {
              const isEditing = editingId === recipe.id

              if (isEditing) {
                return (
                  <div
                    key={recipe.id}
                    className="border border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50"
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleSaveEdit(recipe.id)}
                        disabled={saving}
                        className="text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={recipe.id} className="space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    {/* Name + date — clickable to detail */}
                    <button
                      onClick={() => navigate(`/recipes/${recipe.id}`)}
                      className="flex-1 text-left min-w-0"
                    >
                      <span className="block font-medium text-gray-900 truncate">{recipe.name}</span>
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {formatDate(recipe.created_at)}
                      </span>
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(recipe)}
                        className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-md px-2 py-1 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(recipe.id)}
                        disabled={deleting}
                        className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-md px-2 py-1 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Batch warning */}
                  {deleteWarningId === recipe.id && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      This recipe has active batches and cannot be deleted.
                    </p>
                  )}
                </div>
              )
          })}
          </div>
        )}
      </div>
    </div>
  )
}
