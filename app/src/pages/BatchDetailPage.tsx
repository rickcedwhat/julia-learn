import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ── Types ────────────────────────────────────────────────────────────────────

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
  recipe_id: string | null
  name: string
  marker_label: string
  marker_color: string
  total_weight_g: number | null
  total_macros: BatchMacros | null
  created_at: string
  recipes: { name: string } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function macroLabel(key: keyof BatchMacros): string {
  const map: Record<keyof BatchMacros, string> = {
    calories: 'Calories',
    protein_g: 'Protein (g)',
    fat_g: 'Fat (g)',
    carbs_g: 'Carbs (g)',
    fiber_g: 'Fiber (g)',
    sugar_g: 'Sugar (g)',
  }
  return map[key]
}

const MACRO_KEYS: (keyof BatchMacros)[] = [
  'calories',
  'protein_g',
  'fat_g',
  'carbs_g',
  'fiber_g',
  'sugar_g',
]

// ── Batch Detail Page ─────────────────────────────────────────────────────────

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [batch, setBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Inline edit: name
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Inline edit: weight
  const [editingWeight, setEditingWeight] = useState(false)
  const [editWeight, setEditWeight] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [weightError, setWeightError] = useState<string | null>(null)

  // Portion calculator
  const [portionG, setPortionG] = useState('')

  // Create Serving Label
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [labelName, setLabelName] = useState('')
  const [labelServingG, setLabelServingG] = useState('')
  const [savingLabel, setSavingLabel] = useState(false)
  const [labelError, setLabelError] = useState<string | null>(null)
  const [savedLabelId, setSavedLabelId] = useState<string | null>(null)

  // Inline edit: macros
  const [editingMacros, setEditingMacros] = useState(false)
  const [editMacros, setEditMacros] = useState<Record<keyof BatchMacros, string>>({
    calories: '',
    protein_g: '',
    fat_g: '',
    carbs_g: '',
    fiber_g: '',
    sugar_g: '',
  })
  const [savingMacros, setSavingMacros] = useState(false)
  const [macrosError, setMacrosError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!id) return
      const { data, error } = await supabase
        .from('batches')
        .select('*, recipes(name)')
        .eq('id', id)
        .single()
      if (!cancelled) {
        if (error) {
          setLoadError(error.message)
        } else {
          setBatch(data as Batch)
        }
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSaveName() {
    if (!batch) return
    if (!editName.trim()) {
      setNameError('Name is required')
      return
    }
    setSavingName(true)
    setNameError(null)
    const { error } = await supabase
      .from('batches')
      .update({ name: editName.trim() })
      .eq('id', batch.id)
    setSavingName(false)
    if (error) {
      setNameError(error.message)
      return
    }
    setBatch((prev) => (prev ? { ...prev, name: editName.trim() } : prev))
    setEditingName(false)
  }

  async function handleSaveWeight() {
    if (!batch) return
    setSavingWeight(true)
    setWeightError(null)
    const weightVal = editWeight !== '' ? parseFloat(editWeight) : null
    const { error } = await supabase
      .from('batches')
      .update({ total_weight_g: weightVal })
      .eq('id', batch.id)
    setSavingWeight(false)
    if (error) {
      setWeightError(error.message)
      return
    }
    setBatch((prev) => (prev ? { ...prev, total_weight_g: weightVal } : prev))
    setEditingWeight(false)
  }

  async function handleSaveMacros() {
    if (!batch) return
    setSavingMacros(true)
    setMacrosError(null)
    const macros: BatchMacros = {
      calories: editMacros.calories !== '' ? parseFloat(editMacros.calories) : null,
      protein_g: editMacros.protein_g !== '' ? parseFloat(editMacros.protein_g) : null,
      fat_g: editMacros.fat_g !== '' ? parseFloat(editMacros.fat_g) : null,
      carbs_g: editMacros.carbs_g !== '' ? parseFloat(editMacros.carbs_g) : null,
      fiber_g: editMacros.fiber_g !== '' ? parseFloat(editMacros.fiber_g) : null,
      sugar_g: editMacros.sugar_g !== '' ? parseFloat(editMacros.sugar_g) : null,
    }
    const hasMacros = Object.values(macros).some((v) => v !== null)
    const { error } = await supabase
      .from('batches')
      .update({ total_macros: hasMacros ? macros : null })
      .eq('id', batch.id)
    setSavingMacros(false)
    if (error) {
      setMacrosError(error.message)
      return
    }
    setBatch((prev) => (prev ? { ...prev, total_macros: hasMacros ? macros : null } : prev))
    setEditingMacros(false)
  }

  async function handleCreateLabel(e: React.FormEvent) {
    e.preventDefault()
    if (!batch || !user) return
    if (!labelName.trim()) {
      setLabelError('Label name is required')
      return
    }
    const servingG = parseFloat(labelServingG)
    if (isNaN(servingG) || servingG <= 0) {
      setLabelError('Enter a valid serving size')
      return
    }
    if (!batch.total_weight_g || !batch.total_macros) {
      setLabelError('Batch needs total weight and macros to create a label')
      return
    }
    setSavingLabel(true)
    setLabelError(null)

    const scale = servingG / batch.total_weight_g
    const sm = (v: number | null) => (v != null ? Math.round(v * scale * 10) / 10 : null)

    const { data, error } = await supabase
      .from('labels')
      .insert({
        user_id: user.id,
        name: labelName.trim(),
        origin: 'batch',
        batch_id: batch.id,
        serving_size: `${servingG}g`,
        calories:  sm(batch.total_macros.calories),
        protein_g: sm(batch.total_macros.protein_g),
        fat_g:     sm(batch.total_macros.fat_g),
        carbs_g:   sm(batch.total_macros.carbs_g),
        fiber_g:   sm(batch.total_macros.fiber_g),
        sugar_g:   sm(batch.total_macros.sugar_g),
      })
      .select('id')
      .single()

    setSavingLabel(false)
    if (error) {
      setLabelError(error.message)
      return
    }
    setSavedLabelId((data as { id: string }).id)
    setShowLabelForm(false)
  }

  function startEditMacros() {
    if (!batch) return
    const m = batch.total_macros
    setEditMacros({
      calories: m?.calories != null ? String(m.calories) : '',
      protein_g: m?.protein_g != null ? String(m.protein_g) : '',
      fat_g: m?.fat_g != null ? String(m.fat_g) : '',
      carbs_g: m?.carbs_g != null ? String(m.carbs_g) : '',
      fiber_g: m?.fiber_g != null ? String(m.fiber_g) : '',
      sugar_g: m?.sugar_g != null ? String(m.sugar_g) : '',
    })
    setMacrosError(null)
    setEditingMacros(true)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (loadError || !batch) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{loadError ?? 'Batch not found.'}</p>
        <Link to="/recipes" className="text-sm text-blue-500 hover:text-blue-700">
          ← Recipes
        </Link>
      </div>
    )
  }

  const recipeName = batch.recipes?.name ?? null

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-blue-500">
          <Link to="/recipes" className="hover:text-blue-700">
            ← Recipes
          </Link>
          {recipeName && batch.recipe_id && (
            <>
              <span className="text-gray-400">/</span>
              <Link to={`/recipes/${batch.recipe_id}`} className="hover:text-blue-700">
                {recipeName}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-500">Batch</span>
            </>
          )}
        </div>

        {/* Batch Name */}
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
                setEditName(batch.name)
                setEditingName(true)
                setNameError(null)
              }}
              className="group w-full text-left"
              title="Click to edit name"
            >
              <h1 className="text-2xl font-semibold text-gray-900 group-hover:text-gray-600 transition-colors">
                {batch.name}
              </h1>
            </button>
          )}
          <p className="text-xs text-gray-400">{formatDate(batch.created_at)}</p>
        </div>

        {/* Marker chip */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Marker</p>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-full">
            <span
              style={{ backgroundColor: batch.marker_color }}
              className="w-3 h-3 rounded-full inline-block shrink-0"
            />
            <span className="text-sm font-medium text-gray-700">{batch.marker_label}</span>
          </span>
        </div>

        {/* Total weight */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Weight</p>
          {editingWeight ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  autoFocus
                  min="0"
                  step="any"
                  placeholder="Weight in grams"
                  className="w-40 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">g</span>
              </div>
              {weightError && <p className="text-xs text-red-600">{weightError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleSaveWeight()}
                  disabled={savingWeight}
                  className="text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {savingWeight ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingWeight(false)
                    setWeightError(null)
                  }}
                  className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">
                {batch.total_weight_g != null ? `${batch.total_weight_g} g` : '—'}
              </span>
              <button
                onClick={() => {
                  setEditWeight(batch.total_weight_g != null ? String(batch.total_weight_g) : '')
                  setEditingWeight(true)
                  setWeightError(null)
                }}
                className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-md px-2 py-1 transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Macros panel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Macros</p>
            {!editingMacros && (
              <button
                onClick={startEditMacros}
                className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-md px-2 py-1 transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {editingMacros ? (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {MACRO_KEYS.map((key) => (
                  <input
                    key={key}
                    type="number"
                    value={editMacros[key]}
                    onChange={(e) =>
                      setEditMacros((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={macroLabel(key)}
                    min="0"
                    step="any"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ))}
              </div>
              {macrosError && <p className="text-xs text-red-600">{macrosError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleSaveMacros()}
                  disabled={savingMacros}
                  className="text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {savingMacros ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingMacros(false)
                    setMacrosError(null)
                  }}
                  className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {MACRO_KEYS.map((key) => {
                  const val = batch.total_macros?.[key]
                  return (
                    <div key={key} className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-500">{macroLabel(key)}</span>
                      <span className="text-sm font-medium text-gray-800">
                        {val != null ? val : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        {/* Portion Calculator */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Portion Calculator
          </p>
          {batch.total_weight_g == null || batch.total_macros == null ? (
            <p className="text-xs text-gray-400 italic">
              Set total weight and macros above to enable portion scaling.
            </p>
          ) : (
            <div className="border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={portionG}
                  onChange={(e) => setPortionG(e.target.value)}
                  min="0"
                  step="any"
                  placeholder="Portion weight"
                  className="w-36 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">g</span>
              </div>

              {/* Scaled macros */}
              {(() => {
                const g = parseFloat(portionG)
                const valid = !isNaN(g) && g > 0 && batch.total_weight_g != null && batch.total_macros != null
                const scale = valid ? g / batch.total_weight_g! : null
                const scaledVal = (v: number | null) =>
                  scale != null && v != null ? (v * scale).toFixed(1) : '—'
                return (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {MACRO_KEYS.map((key) => (
                      <div key={key} className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-500">{macroLabel(key)}</span>
                        <span className="text-sm font-medium text-gray-800">
                          {scaledVal(batch.total_macros![key])}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })()}

              <button
                onClick={() => {
                  const g = parseFloat(portionG)
                  if (!isNaN(g) && g > 0) {
                    navigate(`/?batch=${batch.id}&portionG=${g}`)
                  }
                }}
                disabled={isNaN(parseFloat(portionG)) || parseFloat(portionG) <= 0}
                className="text-sm px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-medium rounded-lg transition-colors"
              >
                Use in meal →
              </button>
            </div>
          )}
        </div>
        {/* Create Serving Label */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Serving Label
          </p>
          {batch.total_weight_g == null || batch.total_macros == null ? (
            <p className="text-xs text-gray-400 italic">
              Set total weight and macros above to create a serving label.
            </p>
          ) : savedLabelId ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <span className="text-sm text-green-700 font-medium">Label saved to library!</span>
              <a
                href={`/library`}
                className="text-sm text-green-600 hover:text-green-800 underline"
              >
                View in library →
              </a>
            </div>
          ) : showLabelForm ? (
            <form
              onSubmit={(e) => void handleCreateLabel(e)}
              className="border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <input
                type="text"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder="Label name (e.g. Turkey Maduro Beans Mix)"
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={labelServingG}
                  onChange={(e) => setLabelServingG(e.target.value)}
                  placeholder="Serving size"
                  min="1"
                  step="any"
                  className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">g per serving</span>
              </div>

              {/* Live preview of scaled macros */}
              {(() => {
                const g = parseFloat(labelServingG)
                const valid = !isNaN(g) && g > 0
                const scale = valid ? g / batch.total_weight_g! : null
                const sv = (v: number | null) =>
                  scale != null && v != null ? (v * scale).toFixed(1) : '—'
                const m = batch.total_macros!
                return valid ? (
                  <div className="bg-gray-50 rounded-lg px-3 py-2 grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                    {(
                      [
                        ['Cal', m.calories],
                        ['Protein', m.protein_g],
                        ['Fat', m.fat_g],
                        ['Carbs', m.carbs_g],
                        ['Fiber', m.fiber_g],
                        ['Sugar', m.sugar_g],
                      ] as [string, number | null][]
                    ).map(([lbl, val]) => (
                      <div key={lbl} className="flex justify-between">
                        <span className="text-gray-400">{lbl}</span>
                        <span className="font-medium text-gray-700">{sv(val)}</span>
                      </div>
                    ))}
                  </div>
                ) : null
              })()}

              {labelError && <p className="text-xs text-red-600">{labelError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingLabel}
                  className="flex-1 text-sm py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {savingLabel ? 'Saving…' : 'Save Label'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLabelForm(false); setLabelError(null) }}
                  className="flex-1 text-sm py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                // Pre-fill name from recipe if available
                setLabelName(recipeName ? `${recipeName}` : batch.name)
                setLabelServingG('')
                setLabelError(null)
                setShowLabelForm(true)
              }}
              className="w-full text-sm border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-xl px-4 py-3 transition-colors"
            >
              + Create serving label
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
