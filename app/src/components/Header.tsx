import { useState, useRef, useEffect } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

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
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Account menu"
          >
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.email ?? 'User avatar'}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                {user.email?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => { supabase.auth.signOut(); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
