import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Status = 'pending' | 'ok' | 'error'

interface Check {
  status: Status
  error?: string
}

async function pingSupabase(): Promise<Check> {
  try {
    const { error } = await supabase.from('labels').select('id').limit(1)
    return error ? { status: 'error', error: error.message } : { status: 'ok' }
  } catch (e) {
    return { status: 'error', error: String(e) }
  }
}

async function pingGemini(): Promise<Check> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
      }
    )
    return res.ok ? { status: 'ok' } : { status: 'error', error: `HTTP ${res.status}` }
  } catch (e) {
    return { status: 'error', error: String(e) }
  }
}

function Badge({ check, label }: { check: Check; label: string }) {
  if (check.status === 'pending') {
    return <p className="text-gray-500">⏳ {label} — checking…</p>
  }
  if (check.status === 'ok') {
    return <p className="text-green-600">✅ {label} — Connected</p>
  }
  return (
    <div>
      <p className="text-red-600">❌ {label} — Failed</p>
      {check.error && <p className="text-sm text-red-400 ml-6">{check.error}</p>}
    </div>
  )
}

export default function Health() {
  const [supabaseCheck, setSupabaseCheck] = useState<Check>({ status: 'pending' })
  const [geminiCheck, setGeminiCheck] = useState<Check>({ status: 'pending' })

  useEffect(() => {
    pingSupabase().then(setSupabaseCheck)
    pingGemini().then(setGeminiCheck)
  }, [])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="space-y-3 p-8">
        <h1 className="text-xl font-semibold mb-4">Health</h1>
        <Badge check={supabaseCheck} label="Supabase" />
        <Badge check={geminiCheck} label="Gemini" />
      </div>
    </div>
  )
}
