import { NavLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true'

const NAV_LINKS = [
  { to: '/', label: 'Chat', end: true },
  { to: '/log', label: 'Log', end: false },
  { to: '/library', label: 'Library', end: false },
  { to: '/recipes', label: 'Recipes', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

function navClass({ isActive }: { isActive: boolean }) {
  return `text-sm font-medium transition-colors ${
    isActive ? 'text-gray-900 border-b-2 border-gray-900 pb-0.5' : 'text-gray-400 hover:text-gray-700'
  }`
}

export function Header() {
  const { user } = useAuth()

  function handleSignOut() {
    supabase.auth.signOut()
  }

  if (!user && !AUTH_BYPASS) return null

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <nav className="flex items-center gap-4">
        <span className="font-semibold text-gray-800 mr-1">Julia</span>
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className={navClass}>
            {label}
          </NavLink>
        ))}
      </nav>
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
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
