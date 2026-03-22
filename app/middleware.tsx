import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/update-password',
  '/privacy',
  '/terms',
  '/cookies',
  '/', // landing page (if public)
]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirect unauthenticated users away from protected routes
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from public auth pages
  if (user && isPublicRoute && !request.nextUrl.pathname.startsWith('/settings')) {
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // ---------- Role‑based protection (requires authenticated user) ----------
  if (user) {
    // Fetch user's role from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // If profile is missing or error, default to no role (or you could redirect to a profile completion page)
    const role = profile?.role || null

    // Protect admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (role !== 'admin') {
        const redirectUrl = new URL('/dashboard', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Protect mechanic dashboard
    if (request.nextUrl.pathname.startsWith('/marketplace/mechanics/dashboard')) {
      // Check if user is actually a mechanic (has a record in mechanics table)
      const { data: mechanic, error: mechanicError } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // If not a mechanic and not admin, redirect to registration
      if (!mechanic && role !== 'admin') {
        const redirectUrl = new URL('/marketplace/mechanics/register', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    // (Optional) Protect other role‑specific routes like /control-center or /settings if needed
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes – let API routes handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}