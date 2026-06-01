import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ── Types ────────────────────────────────────────────────────────────────────

interface Recipe {
  id: string
  user_id: string
  name: string
  notes: string | null
  ingredients: string | null
  created_at: string
}

interface BatchMacros {
  calories: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  fiber_g: number | null
  sugar_g: number | null
}

interface Batch {
  id: string
  user_id: string
  recipe_id: string
  name: string
  marker_label: string
  marker_color: string
  total_weight_g: number | null
  total_macros: BatchMacros | null
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

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── Recipe Detail Page ────────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

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

  // Inline edit state for ingredients
  const [editingIngredients, setEditingIngredients] = useState(false)
  const [editIngredients, setEditIngredients] = useState('')
  const [savingIngredients, setSavingIngredients] = useState(false)
  const [ingredientsError, setIngredientsError] = useState<string | null>(null)

  // Batches state
  const [batches, setBatches] = useState<Batch[]>([])
  const [batchesLoading, setBatchesLoading] = useState(true)

  // New batch form state
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [batchName, setBatchName] = useState('')
  const [batchMarkerLabel, setBatchMarkerLabel] = useState('')
  const [batchMarkerColor, setBatchMarkerColor] = useState('#f97316')
  const [batchWeightG, setBatchWeightG] = useState('')
  const [batchCalories, setBatchCalories] = useState('')
  const [batchProtein, setBatchProtein] = useState('')
  const [batchFat, setBatchFat] = useState('')
  const [batchCarbs, setBatchCarbs] = useState('')
  const [batchFiber, setBatchFiber] = useState('')
  const [batchSugar, setBatchSugar] = useState('')
  const [creatingBatch, setCreatingBatch] = useState(false)
  const [batchCreateError, setBatchCreateError] = useState<string | null>(null)

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!id) return
      const { data } = await supabase
        .from('batches')
        .select('*')
        .eq('recipe_id', id)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setBatches((data as Batch[]) ?? [])
        setBatchesLoading(false)
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

  async function handleSaveIngredients() {
    if (!recipe) return
    setSavingIngredients(true)
    setIngredientsError(null)
    const { error } = await supabase
      .from('recipes')
      .update({ ingredients: editIngredients.trim() || null })
      .eq('id', recipe.id)
    setSavingIngredients(false)
    if (error) {
      setIngredientsError(error.message)
      return
    }
    setRecipe((prev) => (prev ? { ...prev, ingredients: editIngredients.trim() || null } : prev))
    setEditingIngredients(false)
  }

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault()
    if (!batchName.trim()) {
      setBatchCreateError('Name is required')
      return
    }
    if (!batchMarkerLabel.trim()) {
      setBatchCreateError('Marker label is required')
      return
    }
    if (!user?.id || !id) return

    setCreatingBatch(true)
    setBatchCreateError(null)

    const macros: BatchMacros = {
      calories: batchCalories !== '' ? parseFloat(batchCalories) : null,
      protein_g: batchProtein !== '' ? parseFloat(batchProtein) : null,
      fat_g: batchFat !== '' ? parseFloat(batchFat) : null,
      carbs_g: batchCarbs !== '' ? parseFloat(batchCarbs) : null,
      fiber_g: batchFiber !== '' ? parseFloat(batchFiber) : null,
      sugar_g: batchSugar !== '' ? parseFloat(batchSugar) : null,
    }
    const hasMacros = Object.values(macros).some((v) => v !== null)

    const { data, error } = await supabase
      .from('batches')
      .insert({
        user_id: user.id,
        recipe_id: id,
        name: batchName.trim(),
        marker_label: batchMarkerLabel.trim(),
        marker_color: batchMarkerColor,
        total_weight_g: batchWeightG !== '' ? parseFloat(batchWeightG) : null,
        total_macros: hasMacros ? macros : null,
      })
      .select()
      .single()

    setCreatingBatch(false)
    if (error) {
      setBatchCreateError(error.message)
      return
    }
    setBatches((prev) => [data as Batch, ...prev])
    // Reset form
    setBatchName('')
    setBatchMarkerLabel('')
    setBatchMarkerColor('#f97316')
    setBatchWeightG('')
    setBatchCalories('')
    setBatchProtein('')
    setBatchFat('')
    setBatchCarbs('')
    setBatchFiber('')
    setBatchSugar('')
    setShowBatchForm(false)
  }

  async function handleDeleteBatch(batchId: string) {
    setDeletingId(batchId)
    const { error } = await supabase.from('batches').delete().eq('id', batchId)
    setDeletingId(null)
    if (!error) {
      setBatches((prev) => prev.filter((b) => b.id !== batchId))
      setDeleteConfirmId(null)
    }
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

        {/* Ingredients */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Standard Ingredients</p>
          {editingIngredients ? (
            <div className="space-y-2">
              <textarea
                value={editIngredients}
                onChange={(e) => setEditIngredients(e.target.value)}
                autoFocus
                rows={6}
                placeholder={'One ingredient per line, e.g.:\n3 lbs 99/1 ground turkey\n3 cans black beans\n544g sweet plantains\n2 packets taco seasoning'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              />
              {ingredientsError && <p className="text-xs text-red-600">{ingredientsError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleSaveIngredients()}
                  disabled={savingIngredients}
                  className="text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {savingIngredients ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingIngredients(false)
                    setIngredientsError(null)
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
                setEditIngredients(recipe.ingredients ?? '')
                setEditingIngredients(true)
                setIngredientsError(null)
              }}
              className="group w-full text-left"
              title="Click to edit ingredients"
            >
              {recipe.ingredients ? (
                <pre className="text-sm text-gray-700 group-hover:text-gray-500 transition-colors whitespace-pre-wrap font-sans">
                  {recipe.ingredients}
                </pre>
              ) : (
                <p className="text-sm text-gray-400 group-hover:text-gray-500 transition-colors italic">
                  No ingredients yet. Click to add…
                </p>
              )}
            </button>
          )}
        </div>

        {/* Start Batch in Chat */}
        {recipe.ingredients && (
          <button
            onClick={() => navigate(`/?recipe=${recipe.id}`)}
            className="w-full text-sm bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            Start Batch in Chat →
          </button>
        )}

        {/* Batches section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Batches</p>
            {!showBatchForm && (
              <button
                onClick={() => {
                  setShowBatchForm(true)
                  setBatchCreateError(null)
                }}
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                New Batch
              </button>
            )}
          </div>

          {/* New Batch form */}
          {showBatchForm && (
            <form
              onSubmit={(e) => void handleCreateBatch(e)}
              className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50"
            >
              <p className="text-sm font-semibold text-gray-700">New Batch</p>

              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Batch name"
                required
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex gap-3">
                <input
                  type="text"
                  value={batchMarkerLabel}
                  onChange={(e) => setBatchMarkerLabel(e.target.value)}
                  placeholder="Marker label (e.g. orange)"
                  required
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 shrink-0">Color</label>
                  <input
                    type="color"
                    value={batchMarkerColor}
                    onChange={(e) => setBatchMarkerColor(e.target.value)}
                    className="h-9 w-12 border border-gray-300 rounded-lg cursor-pointer p-0.5"
                  />
                </div>
              </div>

              <input
                type="number"
                value={batchWeightG}
                onChange={(e) => setBatchWeightG(e.target.value)}
                placeholder="Total weight (g) — optional"
                min="0"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Macros (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['Calories', batchCalories, setBatchCalories],
                      ['Protein (g)', batchProtein, setBatchProtein],
                      ['Fat (g)', batchFat, setBatchFat],
                      ['Carbs (g)', batchCarbs, setBatchCarbs],
                      ['Fiber (g)', batchFiber, setBatchFiber],
                      ['Sugar (g)', batchSugar, setBatchSugar],
                    ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]
                  ).map(([label, val, setter]) => (
                    <input
                      key={label}
                      type="number"
                      value={val}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={label}
                      min="0"
                      step="any"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ))}
                </div>
              </div>

              {batchCreateError && <p className="text-xs text-red-600">{batchCreateError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingBatch}
                  className="flex-1 text-sm py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {creatingBatch ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchForm(false)
                    setBatchCreateError(null)
                  }}
                  className="flex-1 text-sm py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Batch list */}
          {batchesLoading ? (
            <p className="text-sm text-gray-400">Loading batches…</p>
          ) : batches.length === 0 && !showBatchForm ? (
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-500">No batches yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {batches.map((batch) => (
                <div key={batch.id} className="space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    {/* Clickable batch info */}
                    <button
                      onClick={() => navigate(`/batches/${batch.id}`)}
                      className="flex-1 text-left min-w-0"
                    >
                      {/* Marker chip */}
                      <span className="inline-flex items-center gap-1.5 mb-1">
                        <span
                          style={{ backgroundColor: batch.marker_color }}
                          className="w-3 h-3 rounded-full inline-block shrink-0"
                        />
                        <span className="text-xs font-medium text-gray-600">{batch.marker_label}</span>
                      </span>
                      <span className="block font-medium text-gray-900 truncate">{batch.name}</span>
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {batch.total_weight_g != null && (
                          <span className="mr-2">{batch.total_weight_g}g</span>
                        )}
                        {batch.total_macros?.calories != null && (
                          <span className="mr-2">{batch.total_macros.calories} kcal</span>
                        )}
                        {formatDateShort(batch.created_at)}
                      </span>
                    </button>

                    {/* Delete action */}
                    <div className="shrink-0">
                      {deleteConfirmId === batch.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Are you sure?</span>
                          <button
                            onClick={() => void handleDeleteBatch(batch.id)}
                            disabled={deletingId === batch.id}
                            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            {deletingId === batch.id ? 'Deleting…' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(batch.id)}
                          className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-md px-2 py-1 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
