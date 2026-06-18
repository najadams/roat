import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Network failure (e.g. Supabase unreachable) — treat as unauthenticated
  }

  const pathname = request.nextUrl.pathname
  const isAuthCallback = pathname.startsWith('/auth/callback')
  const isLogin = pathname.startsWith('/login')
  const isSetupPassword = pathname.startsWith('/setup-password')
  const isAccountDisabled = pathname.startsWith('/account-disabled')

  // Redirect unauthenticated users to login
  if (!user && !isLogin && !isAuthCallback) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let profile: {
    role: string
    is_active: boolean
    onboarding_completed_at: string | null
  } | null = null

  if (user) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role, is_active, onboarding_completed_at')
        .eq('id', user.id)
        .single()

      profile = data
    } catch {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (user && profile && !profile.is_active && !isAccountDisabled) {
    return NextResponse.redirect(new URL('/account-disabled', request.url))
  }

  if (user && profile?.is_active && !profile.onboarding_completed_at && !isSetupPassword && !isAuthCallback) {
    return NextResponse.redirect(new URL('/setup-password', request.url))
  }

  // Redirect authenticated users away from login
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL(profile?.onboarding_completed_at ? '/dashboard' : '/setup-password', request.url))
  }

  if (user && profile?.onboarding_completed_at && isSetupPassword) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect admin routes
  if (user && pathname.startsWith('/admin') && profile?.role !== 'regional_admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
