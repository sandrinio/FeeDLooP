/**
 * Authentication Middleware for Protected Routes + Security Headers
 * T045: Create authentication middleware for protected routes in middleware.ts
 * T096: CORS configuration and security headers
 */

import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { defaultSecurity, widgetSecurity, apiSecurity } from './lib/middleware/security'

export default auth((req) => {
  const token = req.auth
  const { pathname } = req.nextUrl

  // Determine which security configuration to use
  let securityMiddleware = defaultSecurity
  if (pathname.startsWith('/api/widget/')) {
    securityMiddleware = widgetSecurity
  } else if (pathname.startsWith('/api/')) {
    securityMiddleware = apiSecurity
  }

  // Handle preflight CORS requests
  const preflightResponse = securityMiddleware.handlePreflightRequest(req)
  if (preflightResponse) {
    return preflightResponse
  }

  // API route protection
  if (pathname.startsWith('/api/')) {
    // Public API routes that don't require authentication
    const publicApiRoutes = [
      '/api/auth',
      '/api/widget/submit',
      '/api/health',
      '/api/status',
      '/api/test-db',
      '/api/test-verify-user'
    ]

    const isPublicApiRoute = publicApiRoutes.some(route =>
      pathname.startsWith(route)
    )

    if (!isPublicApiRoute) {
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        )
      }

      // Add user context to headers for API routes
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-user-id', token.user?.id || '')
      requestHeaders.set('x-user-email', token.user?.email || '')

      const response = NextResponse.next({
        request: {
          headers: requestHeaders
        }
      })
      securityMiddleware.applySecurityHeaders(response, req)
      securityMiddleware.applyCORSHeaders(response, req)
      return response
    }
  }

  // Dashboard route protection
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const signInUrl = new URL('/auth/login', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith('/auth/') && token) {
    const excludeRedirectPaths = ['/auth/error', '/auth/signout']

    if (!excludeRedirectPaths.includes(pathname)) {
      const dashboardUrl = new URL('/dashboard', req.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // Apply security headers to the response
  const response = NextResponse.next()
  securityMiddleware.applySecurityHeaders(response, req)
  securityMiddleware.applyCORSHeaders(response, req)

  return response
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - widget (embeddable widget files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|widget).*)'
  ]
}