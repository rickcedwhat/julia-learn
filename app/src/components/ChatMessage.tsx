import MacroCard from '@/components/MacroCard'
import type { WorkingMealTotals } from '@/lib/gemini'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  mealTotals?: WorkingMealTotals
}

interface Props {
  message: Message
}

export default function ChatMessage({ message }: Props) {
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
      {!isUser && message.mealTotals && (
        <MacroCard totals={message.mealTotals} />
      )}
    </div>
  )
}
