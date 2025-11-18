import { NextRequest, NextResponse } from 'next/server'
import { verifyUserSessionFromRequest, verifyAdminSessionFromRequest } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and API routes (auth handled in route handlers)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/app/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }
  
  // Protect /app routes - require user session
  if (pathname.startsWith('/app')) {
    const userSession = await verifyUserSessionFromRequest(request)
    
    if (!userSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    return NextResponse.next()
  }
  
  // Protect /admin routes - require admin session
  if (pathname.startsWith('/admin')) {
    // Allow access to admin login page
    if (pathname === '/admin/login') {
      return NextResponse.next()
    }
    
    const adminSession = await verifyAdminSessionFromRequest(request)
    
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    
    return NextResponse.next()
  }
  
  // Redirect root to appropriate page based on session
  if (pathname === '/') {
    const userSession = await verifyUserSessionFromRequest(request)
    const adminSession = await verifyAdminSessionFromRequest(request)
    
    if (adminSession) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    
    if (userSession) {
      return NextResponse.redirect(new URL('/app', request.url))
    }
    
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - app/api (App Router API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|app/api|_next/static|_next/image|favicon.ico).*)',
  ],
}
