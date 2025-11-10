import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl
  const { searchParams } = requestUrl
  const origin = requestUrl.origin
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const type = searchParams.get('type') // 'recovery' for password reset
  
  let next = searchParams.get('next') ?? '/home'
  if (!next.startsWith('/')) {
    next = '/home'
  }
  
  // If this is a password recovery, exchange code and redirect to reset password page
  if (type === 'recovery' && code) {
    try {
      const cookieStore = await cookies()
      const response = NextResponse.next({ request })

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

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Recovery exchange error:', exchangeError)
        return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent('Invalid or expired reset link. Please request a new one.')}`)
      }

      // Success - create redirect response with cookies
      const redirectResponse = NextResponse.redirect(`${origin}/reset-password`)
      
      // Copy cookies to redirect response
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          sameSite: 'lax' as const,
          path: '/',
        })
      })

      return redirectResponse
    } catch (err) {
      console.error('Exception in recovery callback:', err)
      return NextResponse.redirect(`${origin}/signin?error=An unexpected error occurred`)
    }
  }

  // Check for OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/signin`)
  }

  try {
    const cookieStore = await cookies()
    const response = NextResponse.next({ request })

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

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(exchangeError.message)}`)
    }

    // Build redirect URL
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    let redirectUrl = `${origin}${next}`
    if (forwardedHost && !isLocalEnv) {
      redirectUrl = `https://${forwardedHost}${next}`
    }

    const redirectResponse = NextResponse.redirect(redirectUrl)
    
    // Copy cookies to redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: true,
        secure: !isLocalEnv,
        sameSite: 'lax' as const,
        path: '/',
      })
    })

    return redirectResponse
  } catch (err) {
    console.error('Exception:', err)
    return NextResponse.redirect(`${origin}/signin?error=An unexpected error occurred`)
  }
}
