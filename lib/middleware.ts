import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/update-password',
  '/privacy',
  '/terms',
  '/cookies',
];

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function isPublicRoute(pathname: string) {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);

            response = NextResponse.next({
              request,
            });

            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const apiRoute = pathname.startsWith('/api');
  const publicPath = isPublicRoute(pathname);

  if (!user && !publicPath && !apiRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!user && apiRoute) {
    return response;
  }

  if (user && publicPath && !pathname.startsWith('/settings')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)$).*)',
  ],
};