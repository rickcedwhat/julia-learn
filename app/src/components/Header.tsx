import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true'

export function Header() {
  const { user } = useAuth()

  function handleSignOut() {
    supabase.auth.signOut()
  }

  // In preview deployments (AUTH_BYPASS=true) there is no OAuth user,
  // but we still want nav links visible.
  if (!user && !AUTH_BYPASS) return null

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <div className="flex items-center gap-4">
        <Link to="/" className="font-semibold text-gray-800 hover:text-gray-600 transition-colors">Julia</Link>
        <Link to="/log" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Log</Link>
        <Link to="/library" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Library</Link>
        <Link to="/recipes" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Recipes</Link>
        <Link to="/settings" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Settings</Link>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt={user.email ?? 'User avatar'}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
