import MacroCard from '@/components/MacroCard'
import type { BatchDerivation } from '@/components/MacroCard'
import SaveWidget from '@/components/SaveWidget'
import type { WorkingMealTotals, OcrTotals } from '@/lib/gemini'
import type { UserRule } from '@/hooks/useUserRules'

export type { BatchDerivation }

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  /**
   * Text sent to Gemini in place of `text` when building conversation history.
   * Use this for messages whose display text is vague (e.g. "Here are the
   * nutrition facts I found:") but whose Gemini history entry should carry the
   * actual macro numbers so later turns retain full context.
   */
  geminiText?: string
  mealTotals?: WorkingMealTotals
  saveWidget?: {
    suggestedName: string
    totals: WorkingMealTotals
  }
  logged?: boolean
  /** base64 data URL for an image the user attached */
  imageDataUrl?: string
  /** OCR result to show as a MacroCard (nullable fields) */
  ocrTotals?: OcrTotals
  /** Data URL of the original scanned image — passed to MacroCard for upload on save */
  ocrImageUrl?: string
  /** Per-meal rules to evaluate in MacroCard badges */
  rules?: UserRule[]
  /** Batch portion scaling derivation to show in meal card */
  batchDerivation?: BatchDerivation
  /** User-reported issue marker — renders as a timeline flag, not a chat bubble */
  flagged?: boolean
}

interface Props {
  message: Message
  onLogged?: (messageId: string, confirmationText: string) => void
  /** Called when a MacroCard saves a label to the library (to add it to context tray). */
  onLabelSaved?: (savedId: string, savedName: string) => void
  /** Called when the user clicks "Log Meal" on a MacroCard. */
  onLogMeal?: (totals: WorkingMealTotals | OcrTotals) => void
}

export default function ChatMessage({ message, onLogged, onLabelSaved, onLogMeal }: Props) {
  const isUser = message.role === 'user'

  // Flagged messages render as a centered timeline marker, not a chat bubble
  if (message.flagged) {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-amber-200" />
        <span className="text-xs text-amber-500 font-medium shrink-0">⚑ {message.text}</span>
        <div className="flex-1 h-px bg-amber-200" />
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Image preview (user-attached photo) */}
      {message.imageDataUrl && (
        <img
          src={message.imageDataUrl}
          alt="Nutrition label"
          className="max-h-64 max-w-[80%] rounded-xl border border-gray-200 shadow-sm object-contain"
        />
      )}

      {/* Text bubble — only render if there's text */}
      {message.text && (
        <div
          className={`max-w-[80%] rounded-2xl px-4 py-2 whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-blue-500 text-white ml-auto'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {message.text}
        </div>
      )}

      {!isUser && message.saveWidget && !message.logged && (
        <SaveWidget
          suggestedName={message.saveWidget.suggestedName}
          totals={message.saveWidget.totals}
          onLogged={(confirmationText) => onLogged?.(message.id, confirmationText)}
        />
      )}
      {!isUser && message.logged && message.saveWidget && (
        <MacroCard totals={message.saveWidget.totals} rules={message.rules} />
      )}
      {!isUser && message.mealTotals && !message.saveWidget && (
        <MacroCard
          totals={message.mealTotals}
          origin="ai_estimated"
          rules={message.rules}
          derivation={message.batchDerivation}
          onSaved={onLabelSaved}
          onLogMeal={onLogMeal ? () => onLogMeal(message.mealTotals!) : undefined}
        />
      )}

      {/* OCR totals from label photo (nullable fields — shows — for missing values) */}
      {!isUser && message.ocrTotals && (
        <MacroCard
          totals={message.ocrTotals}
          origin="verified_label"
          rules={message.rules}
          derivation={message.batchDerivation}
          onSaved={onLabelSaved}
          onLogMeal={onLogMeal ? () => onLogMeal(message.ocrTotals!) : undefined}
          imageUrl={message.ocrImageUrl}
          suggestedName={message.ocrTotals.suggested_name ?? undefined}
        />
      )}
    </div>
  )
}
