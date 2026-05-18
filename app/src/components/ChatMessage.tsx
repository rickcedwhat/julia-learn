import MacroCard from '@/components/MacroCard'
import SaveWidget from '@/components/SaveWidget'
import type { WorkingMealTotals } from '@/lib/gemini'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  mealTotals?: WorkingMealTotals
  saveWidget?: {
    suggestedName: string
    totals: WorkingMealTotals
  }
  logged?: boolean
}

interface Props {
  message: Message
  onLogged?: (messageId: string, confirmationText: string) => void
}

export default function ChatMessage({ message, onLogged }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-blue-500 text-white ml-auto'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {message.text}
      </div>
      {!isUser && message.saveWidget && !message.logged && (
        <SaveWidget
          suggestedName={message.saveWidget.suggestedName}
          totals={message.saveWidget.totals}
          onLogged={(confirmationText) => onLogged?.(message.id, confirmationText)}
        />
      )}
      {!isUser && message.logged && message.saveWidget && (
        <MacroCard totals={message.saveWidget.totals} />
      )}
      {!isUser && message.mealTotals && !message.saveWidget && (
        <MacroCard totals={message.mealTotals} />
      )}
    </div>
  )
}
