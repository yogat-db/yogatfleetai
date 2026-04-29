import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Public routes that don't require authentication (anyone can access, including logged-in users)
const publicContentRoutes = ['/privacy', '/terms', '/cookies']
// Auth routes that should redirect to dashboard if already logged in
const authRoutes = ['/login', '/register', '/forgot-password', '/update-password']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isPublicContent = publicContentRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))

  // Allow public content for all (no redirect)
  if (isPublicContent) {
    return response
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && !isAuthRoute) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth routes (login/register etc.)
  if (user && isAuthRoute) {
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based protection only for authenticated users
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = profile?.role || null

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/marketplace/mechanics/dashboard')) {
      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!mechanic && role !== 'admin') {
        return NextResponse.redirect(new URL('/marketplace/mechanics/register', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}