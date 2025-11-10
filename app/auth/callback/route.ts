import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl
  const { searchParams } = requestUrl
  const origin = requestUrl.origin
  const code = searchParams.get('code')
  
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/'
  }

  if (code) {
    // Create response object to handle cookies properly
    let response = NextResponse.next({
      request,
    })

    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    
    // Log all cookies to see if code verifier is present
    const allCookies = cookieStore.getAll()
    console.log('All cookies:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })))
    
    // Check for PKCE code verifier cookie
    const codeVerifierCookie = allCookies.find(c => c.name.includes('code-verifier') || c.name.includes('pkce'))
    console.log('Code verifier cookie found:', codeVerifierCookie ? 'Yes' : 'No')
    
    console.log('Exchanging code for session...')
    console.log('Callback URL:', requestUrl.toString())
    console.log('Origin:', origin)
    console.log('Code:', code.substring(0, 20) + '...')
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      // If code exchange succeeded, redirect to app
      if (!error && data?.session) {
        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'

        let redirectUrl = `${origin}${next}`
        if (forwardedHost && !isLocalEnv) {
          redirectUrl = `https://${forwardedHost}${next}`
        }

        // Create redirect response with all cookies from the response object
        const redirectResponse = NextResponse.redirect(redirectUrl)
        
        // Copy all cookies from the response, ensuring proper settings for production
        response.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, {
            ...cookie,
            httpOnly: cookie.httpOnly ?? true,
            secure: !isLocalEnv, // Use secure cookies in production
            sameSite: 'lax' as const,
            path: '/',
          })
        })
        
        // Also ensure session cookies are properly set
        if (data.session) {
          console.log('Session created successfully, redirecting to:', redirectUrl)
        }
        
        return redirectResponse
      }
      
      // If code exchange failed, check if user already has a session or can be authenticated
      if (error) {
        console.log('Code exchange failed, checking for existing user/session...')
        
        // First, check if user already has a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (session) {
          console.log('Session found! User is already authenticated, redirecting...')
          const forwardedHost = request.headers.get('x-forwarded-host')
          const isLocalEnv = process.env.NODE_ENV === 'development'

          let redirectUrl = `${origin}${next}`
          if (forwardedHost && !isLocalEnv) {
            redirectUrl = `https://${forwardedHost}${next}`
          }

          const redirectResponse = NextResponse.redirect(redirectUrl)
          response.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value, {
              ...cookie,
              httpOnly: cookie.httpOnly ?? true,
              secure: !isLocalEnv,
              sameSite: 'lax' as const,
              path: '/',
            })
          })
          
          return redirectResponse
        }
        
        // If no session, try to get the user directly (user might have been created)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (user) {
          console.log('User found! User was created, but no session. This might be an email verification issue.')
          console.log('User email:', user.email)
          console.log('User email confirmed:', user.email_confirmed_at ? 'Yes' : 'No')
          
          // If user exists but no session, they might need email verification
          // But for OAuth providers, email is usually confirmed automatically
          // Let's try to refresh the session or just redirect them
          // The middleware will handle session refresh
          
          const forwardedHost = request.headers.get('x-forwarded-host')
          const isLocalEnv = process.env.NODE_ENV === 'development'

          let redirectUrl = `${origin}${next}`
          if (forwardedHost && !isLocalEnv) {
            redirectUrl = `https://${forwardedHost}${next}`
          }

          const redirectResponse = NextResponse.redirect(redirectUrl)
          response.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value, {
              ...cookie,
              httpOnly: cookie.httpOnly ?? true,
              secure: !isLocalEnv,
              sameSite: 'lax' as const,
              path: '/',
            })
          })
          
          return redirectResponse
        }
        
        // If no user and no session, log the error
        console.error('Code exchange error:', error)
        console.error('No existing session or user found')
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        })
        
        // Log the full error for debugging
        console.error('Full error object:', JSON.stringify(error, null, 2))
      }
    } catch (err) {
      console.error('Exception during code exchange:', err)
      if (err instanceof Error) {
        console.error('Error type:', err.constructor.name)
        console.error('Error stack:', err.stack)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

