import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    '[Julia] Missing env var: VITE_SUPABASE_URL\n' +
    'Copy app/.env.example to app/.env and fill in your Supabase project URL.'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    '[Julia] Missing env var: VITE_SUPABASE_ANON_KEY\n' +
    'Copy app/.env.example to app/.env and fill in your Supabase anon key.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
