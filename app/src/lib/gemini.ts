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
When the user indicates they are done and want to log the meal (e.g. "log this", "done", "save this meal", "save it", "that's it"), set ready_to_log to true and suggested_name to a concise descriptive name for the meal (e.g. "Chicken Rice Bowl", "Breakfast Oats", "Post-Workout Shake").`

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
}

const OCR_PROMPT = `You are a nutrition label parser.
Extract exactly these 6 fields from the nutrition label in this image:
- Calories
- Protein (g)
- Fat (g)
- Total Carbs (g)
- Fiber (g)
- Sugar (g)

Return ONLY valid JSON (no markdown, no code fences) in exactly this shape:
{
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
