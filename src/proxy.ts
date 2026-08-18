import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip middleware if API keys are not provided (local dev without env vars)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname;
  
  // Public routes
  const isPublicRoute = path === '/' || path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/api/');

  if (!user && !isPublicRoute) {
    // Redirect unauthenticated users to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Fetch role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role;

    // Prevent authenticated users from visiting login/signup
    if (path.startsWith('/login') || path.startsWith('/signup')) {
      if (role === 'student') return NextResponse.redirect(new URL('/vault/dashboard', request.url))
      if (role === 'mentor') return NextResponse.redirect(new URL('/mentor/dashboard', request.url))
      if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Role-based route protection
    if (path.startsWith('/vault') && role !== 'student') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    if (path.startsWith('/mentor') && role !== 'mentor') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
