import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    console.error('URL:', supabaseUrl ? 'set' : 'missing')
    console.error('Key:', supabaseAnonKey ? 'set' : 'missing')
    throw new Error('Missing Supabase environment variables. Please check your .env.local file and restart your dev server.')
  }

  // Trim whitespace from the anon key
  const trimmedAnonKey = supabaseAnonKey.trim()

  console.log('Creating Supabase server client')
  console.log('URL:', supabaseUrl)
  console.log('Anon Key length:', trimmedAnonKey.length)

  return createServerClient(
    supabaseUrl.trim(),
    trimmedAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

