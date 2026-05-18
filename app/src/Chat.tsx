import { useEffect, useRef, useState } from 'react'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import { useWorkingMeal } from '@/hooks/useWorkingMeal'
import { sendMessage } from '@/lib/gemini'
import type { Message } from '@/components/ChatMessage'
import type { ChatMessage as GeminiMessage } from '@/lib/gemini'

let idCounter = 0
function nextId() {
  return String(++idCounter)
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { update } = useWorkingMeal()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text: string) {
    const userMsg: Message = { id: nextId(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    const history: GeminiMessage[] = [
      ...messages.map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        text: m.text,
      })),
      { role: 'user', text },
    ]

    try {
      const meal = await sendMessage(history)
      update(meal)

      const hasComponents = meal.components.length > 0
      const assistantMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: meal.message,
        mealTotals: hasComponents ? meal.totals : undefined,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      const errorMsg: Message = {
        id: nextId(),
        role: 'assistant',
        text: 'Sorry, something went wrong. Please try again.',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-white">
      <header className="border-b border-gray-200 px-4 py-3 shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">Julia</h1>
        <p className="text-xs text-gray-500">Meal tracking assistant</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !loading && (
          <p className="text-center text-gray-400 text-sm mt-8">
            Tell me what you ate and I&apos;ll track your macros.
          </p>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-gray-100 text-gray-500 text-sm">
              ...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  )
}
