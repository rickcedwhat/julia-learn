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
  "message": "<your human-readable reply here>"
}

When the user hasn't mentioned any food yet, return an empty components array and zero totals, with a helpful message welcoming them.
When the user mentions food, add it to components and compute accurate totals.
When the user corrects something, update the relevant component and recompute totals.
Always maintain cumulative state: if the user says "also add X", keep previous components.`

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
