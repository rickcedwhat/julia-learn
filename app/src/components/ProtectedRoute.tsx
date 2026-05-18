import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

function LoginPage() {
  async function handleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      console.error('Sign in error:', error.message)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Julia</h1>
        <p className="text-gray-500">Sign in to track your nutrition</p>
        <button
          onClick={handleSignIn}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

interface ProtectedRouteProps {
  children: ReactNode
}

// VITE_AUTH_BYPASS=true skips OAuth — set this in Vercel's Preview environment
// so preview deployments are accessible without Google sign-in.
// Supabase queries will return empty data (RLS blocks unauthenticated reads) but
// UI, chat, and OCR features are fully testable.
const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true'

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth()

  if (AUTH_BYPASS) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return <>{children}</>
}
