import type { AiTagKey } from '@/lib/tags'

export interface WorkingMealComponent {
  name: string
  weight_g: number | null
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  sugar_g: number
}

export interface WorkingMealTotals {
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  sugar_g: number
}

export interface WorkingMeal {
  components: WorkingMealComponent[]
  totals: WorkingMealTotals
  message: string
  ready_to_log?: boolean
  suggested_name?: string
}

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

const SYSTEM_PROMPT = `You are Julia, a meal tracking assistant. You help users track their nutrition by maintaining a "working meal" — a running list of food components with accurate macros.

On every turn, respond with valid JSON only (no markdown, no code fences) in this exact shape:
{
  "components": [
    { "name": "...", "weight_g": <number or null>, "calories": <number>, "protein_g": <number>, "fat_g": <number>, "carbs_g": <number>, "fiber_g": <number>, "sugar_g": <number> }
  ],
  "totals": { "calories": <number>, "protein_g": <number>, "fat_g": <number>, "carbs_g": <number>, "fiber_g": <number>, "sugar_g": <number> },
  "message": "<your human-readable reply here>",
  "ready_to_log": <boolean>,
  "suggested_name": "<concise descriptive meal name or null>"
}

When the user hasn't mentioned any food yet, return an empty components array and zero totals, with a helpful message welcoming them. Set ready_to_log to false and suggested_name to null.
When the user mentions food, add it to components and compute accurate totals. Set ready_to_log to false.
When the user corrects something, update the relevant component and recompute totals. Set ready_to_log to false.
Always maintain cumulative state: if the user says "also add X", keep previous components.
When the user indicates they are done and want to log the meal (e.g. "log this", "done", "save this meal", "save it", "that's it"), set ready_to_log to true and suggested_name to a concise descriptive name for the meal (e.g. "Chicken Rice Bowl", "Breakfast Oats", "Post-Workout Shake").

MEAL STATE: Your components array IS the authoritative record of the meal. Never ask the user to confirm or clarify something you already tracked. If the user asks what's in the meal, answer directly from your components list. If they ask "does this include X?", check your components and answer with a confident yes or no — do not hedge or ask them to clarify. You added it; you know.

TOTALS: must always be numbers, never null. If a macro is unknown for a component, use your best estimate. When summing, treat any unknown value as 0. The six totals fields must always be numeric.`

export async function sendMessage(history: ChatMessage[]): Promise<WorkingMeal> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`

  const contents = history.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
    }),
  })

  if (!res.ok) {
    throw new Error(`Gemini API error: HTTP ${res.status}`)
  }

  const data = await res.json()
  const text: string = data.candidates[0].content.parts[0].text

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned) as WorkingMeal
  return parsed
}

// ── OCR ─────────────────────────────────────────────────────────────────────

export interface OcrTotals {
  calories: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  fiber_g: number | null
  sugar_g: number | null
  serving_size?: string | null
  /** Product name read from the label — used to pre-populate the save input, never stored directly. */
  suggested_name?: string | null
}

const OCR_PROMPT = `You are a nutrition label parser.
Extract exactly these fields from the nutrition label in this image:
- Product name (the brand/product name printed on the label, e.g. "Prego Marinara Sauce", "Tostitos Thin & Crispy")
- Serving size (e.g. "4 pieces (140g)", "1 cup (240ml)", "2 tbsp (30g)")
- Calories
- Protein (g)
- Fat (g)
- Total Carbs (g)
- Fiber (g)
- Sugar (g)

Return ONLY valid JSON (no markdown, no code fences) in exactly this shape:
{
  "suggested_name": <string or null>,
  "serving_size": <string or null>,
  "calories": <number or null>,
  "protein_g": <number or null>,
  "fat_g": <number or null>,
  "carbs_g": <number or null>,
  "fiber_g": <number or null>,
  "sugar_g": <number or null>
}

If a field is not visible or legible, use null. Do not guess.`

export async function ocrImage(base64: string, mimeType: string): Promise<OcrTotals> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: OCR_PROMPT },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Gemini OCR error: HTTP ${res.status}`)

  const data = await res.json()
  const raw: string = data.candidates[0].content.parts[0].text
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned) as OcrTotals
}

// ── AI Tag Inference ─────────────────────────────────────────────────────────

const AI_TAG_KEYS: AiTagKey[] = ['sweet_tooth', 'savory', 'filling']

/**
 * Ask Gemini to classify which (if any) of the 3 AI tags apply to this food item.
 * Returns an array of applicable AiTagKey values (may be empty).
 * Fails silently — AI tags are best-effort, never block save.
 */
export async function inferAiTags(
  name: string,
  macros: {
    calories: number | null
    protein_g: number | null
    fat_g: number | null
    carbs_g: number | null
    fiber_g: number | null
    sugar_g: number | null
  }
): Promise<AiTagKey[]> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`

  const prompt = `You are a nutrition classifier. Given a food item's name and macros, determine which of these tags apply. Respond with valid JSON only — an array of applicable tag keys from this list: ["sweet_tooth", "savory", "filling"]. Return an empty array if none apply.

Tag definitions:
- sweet_tooth: dessert-like, sugary foods (candy, cake, cookies, ice cream, sugary drinks)
- savory: salty, savory flavor profile (meats, cheeses, salty snacks, soups)
- filling: high satiety — typically high protein AND high fiber together

Food: "${name}"
Macros: calories=${macros.calories ?? '?'}, protein=${macros.protein_g ?? '?'}g, fat=${macros.fat_g ?? '?'}g, carbs=${macros.carbs_g ?? '?'}g, fiber=${macros.fiber_g ?? '?'}g, sugar=${macros.sugar_g ?? '?'}g

Respond with ONLY a JSON array, e.g.: ["savory"] or ["sweet_tooth"] or [] or ["savory","filling"]`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    })
    const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as unknown[]
    return (parsed as string[]).filter((t): t is AiTagKey => AI_TAG_KEYS.includes(t as AiTagKey))
  } catch {
    return [] // fail silently — AI tags are best-effort
  }
}

// ── Suggestion Inference ─────────────────────────────────────────────────────

/**
 * Ask Gemini which library labels (0–2) would pair well with the current meal.
 * Only returns names that exist in `availableLabels` — never invents new ones.
 * Fails silently.
 */
export async function inferSuggestions(
  mealItems: string[],
  availableLabels: string[],
): Promise<string[]> {
  if (mealItems.length === 0 || availableLabels.length === 0) return []

  const key = import.meta.env.VITE_GEMINI_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`

  const prompt = `You are a meal tracking assistant. The user is building a meal that currently contains:
${mealItems.map((i) => `- ${i}`).join('\n')}

From the user's personal food library, suggest 0–2 items that would pair well with this meal (common sides, condiments, drinks, or complementary foods). Only pick from the library list — never invent new ones. If nothing fits well, return an empty array.

Available library items:
${availableLabels.map((l) => `- ${l}`).join('\n')}

Respond with ONLY a JSON array of label names from the list above. Example: ["Greek Yogurt", "Banana"] or []`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    })
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as unknown[]
    const labelSet = new Set(availableLabels)
    return (parsed as string[]).filter((t) => typeof t === 'string' && labelSet.has(t))
  } catch {
    return []
  }
}

// ── Meta-tag Inference ────────────────────────────────────────────────────────

/**
 * Ask Gemini for hidden search synonyms for a food item.
 * These are never shown in the UI — they exist purely to make search work
 * (e.g. "Tostitos Thin & Crispy" → ["chips", "tortilla chips", "snack", "corn"]).
 * Fails silently — meta-tags are best-effort.
 */
export async function inferMetaTags(name: string): Promise<string[]> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`

  const prompt = `You are a food search indexer. Given a food product name, return a JSON array of 3–8 short search keywords that someone might type to find this item, even if they don't remember the exact brand or name.

Rules:
- Lowercase only
- No duplicates with words already in the name
- Think: generic category, common aliases, key ingredients, cuisine type
- Keep each keyword to 1–2 words max

Examples:
- "Tostitos Thin & Crispy" → ["chips", "tortilla chips", "corn chips", "snack", "crispy"]
- "Prego Marinara Sauce" → ["pasta sauce", "tomato sauce", "marinara", "italian", "sauce"]
- "Chobani Plain Greek Yogurt" → ["yogurt", "greek yogurt", "dairy", "protein", "plain"]

Food: "${name}"

Respond with ONLY a JSON array of strings.`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    })
    const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as unknown[]
    return (parsed as string[]).filter((t) => typeof t === 'string' && t.length > 0)
  } catch {
    return []
  }
}
