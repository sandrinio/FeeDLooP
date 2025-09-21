/**
 * Security Headers Middleware
 * T096: CORS configuration and security headers
 */

import { NextRequest, NextResponse } from 'next/server'

// Security configuration
export interface SecurityConfig {
  cors?: {
    allowedOrigins?: string[] | string
    allowedMethods?: string[]
    allowedHeaders?: string[]
    credentials?: boolean
    maxAge?: number
  }
  csp?: {
    directives?: Record<string, string[]>
    reportOnly?: boolean
  }
  hsts?: {
    maxAge?: number
    includeSubDomains?: boolean
    preload?: boolean
  }
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string
  contentTypeOptions?: boolean
  xssProtection?: boolean
  referrerPolicy?: string
}

// Default security configuration
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  cors: {
    allowedOrigins: process.env.NODE_ENV === 'production'
      ? [process.env.NEXTAUTH_URL || 'https://localhost:3000']
      : ['http://localhost:3000', 'http://localhost:3001'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'project-key', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  csp: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://api.github.com'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    },
    reportOnly: false
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameOptions: 'DENY',
  contentTypeOptions: true,
  xssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin'
}

/**
 * Security middleware class
 */
export class SecurityMiddleware {
  private config: SecurityConfig

  constructor(config: SecurityConfig = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config }
  }

  /**
   * Apply security headers to response
   */
  applySecurityHeaders(response: NextResponse, request?: NextRequest): NextResponse {
    // Content Security Policy
    if (this.config.csp) {
      const cspHeader = this.config.csp.reportOnly
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy'

      const cspValue = this.buildCSPHeader(this.config.csp.directives || {})
      response.headers.set(cspHeader, cspValue)
    }

    // HTTP Strict Transport Security
    if (this.config.hsts && request?.nextUrl.protocol === 'https:') {
      const hstsValue = this.buildHSTSHeader(this.config.hsts)
      response.headers.set('Strict-Transport-Security', hstsValue)
    }

    // X-Frame-Options
    if (this.config.frameOptions) {
      response.headers.set('X-Frame-Options', this.config.frameOptions)
    }

    // X-Content-Type-Options
    if (this.config.contentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff')
    }

    // X-XSS-Protection
    if (this.config.xssProtection) {
      response.headers.set('X-XSS-Protection', '1; mode=block')
    }

    // Referrer-Policy
    if (this.config.referrerPolicy) {
      response.headers.set('Referrer-Policy', this.config.referrerPolicy)
    }

    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off')
    response.headers.set('X-Download-Options', 'noopen')
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    return response
  }

  /**
   * Apply CORS headers to response
   */
  applyCORSHeaders(response: NextResponse, request: NextRequest): NextResponse {
    if (!this.config.cors) return response

    const origin = request.headers.get('origin')
    const requestMethod = request.headers.get('access-control-request-method')
    const requestHeaders = request.headers.get('access-control-request-headers')

    // Handle allowed origins
    if (this.config.cors.allowedOrigins) {
      if (typeof this.config.cors.allowedOrigins === 'string') {
        if (this.config.cors.allowedOrigins === '*') {
          response.headers.set('Access-Control-Allow-Origin', '*')
        } else if (origin === this.config.cors.allowedOrigins) {
          response.headers.set('Access-Control-Allow-Origin', origin)
        }
      } else if (Array.isArray(this.config.cors.allowedOrigins)) {
        if (origin && this.config.cors.allowedOrigins.includes(origin)) {
          response.headers.set('Access-Control-Allow-Origin', origin)
        }
      }
    }

    // Handle allowed methods
    if (this.config.cors.allowedMethods) {
      response.headers.set('Access-Control-Allow-Methods', this.config.cors.allowedMethods.join(', '))
    }

    // Handle allowed headers
    if (this.config.cors.allowedHeaders) {
      response.headers.set('Access-Control-Allow-Headers', this.config.cors.allowedHeaders.join(', '))
    }

    // Handle credentials
    if (this.config.cors.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    // Handle max age for preflight requests
    if (this.config.cors.maxAge && requestMethod) {
      response.headers.set('Access-Control-Max-Age', this.config.cors.maxAge.toString())
    }

    return response
  }

  /**
   * Handle preflight CORS requests
   */
  handlePreflightRequest(request: NextRequest): NextResponse | null {
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      this.applyCORSHeaders(response, request)
      return response
    }
    return null
  }

  /**
   * Build CSP header value
   */
  private buildCSPHeader(directives: Record<string, string[]>): string {
    return Object.entries(directives)
      .map(([directive, values]) => {
        if (values.length === 0) {
          return directive
        }
        return `${directive} ${values.join(' ')}`
      })
      .join('; ')
  }

  /**
   * Build HSTS header value
   */
  private buildHSTSHeader(hsts: NonNullable<SecurityConfig['hsts']>): string {
    let value = `max-age=${hsts.maxAge}`

    if (hsts.includeSubDomains) {
      value += '; includeSubDomains'
    }

    if (hsts.preload) {
      value += '; preload'
    }

    return value
  }

  /**
   * Create middleware function
   */
  middleware() {
    return (request: NextRequest): NextResponse | null => {
      // Handle preflight requests
      const preflightResponse = this.handlePreflightRequest(request)
      if (preflightResponse) {
        return preflightResponse
      }

      return null // Let other middleware handle the request
    }
  }
}

/**
 * Widget-specific CORS configuration (more permissive)
 */
export const WIDGET_CORS_CONFIG: SecurityConfig = {
  cors: {
    allowedOrigins: '*', // Widgets need to work on any domain
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'project-key'],
    credentials: false,
    maxAge: 86400
  },
  frameOptions: 'SAMEORIGIN', // Allow embedding in iframes
  contentTypeOptions: true,
  xssProtection: true
}

/**
 * API-specific CORS configuration (restrictive)
 */
export const API_CORS_CONFIG: SecurityConfig = {
  cors: {
    allowedOrigins: process.env.NODE_ENV === 'production'
      ? [process.env.NEXTAUTH_URL || 'https://localhost:3000']
      : ['http://localhost:3000', 'http://localhost:3001'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 3600
  }
}

/**
 * Helper function to apply security headers to any response
 */
export function withSecurityHeaders(
  response: NextResponse,
  request?: NextRequest,
  config?: SecurityConfig
): NextResponse {
  const security = new SecurityMiddleware(config)
  return security.applySecurityHeaders(response, request)
}

/**
 * Helper function to apply CORS headers to any response
 */
export function withCORSHeaders(
  response: NextResponse,
  request: NextRequest,
  config?: SecurityConfig
): NextResponse {
  const security = new SecurityMiddleware(config)
  return security.applyCORSHeaders(response, request)
}

/**
 * Create security middleware for API routes
 */
export function withSecurity(
  config: SecurityConfig,
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  const security = new SecurityMiddleware(config)

  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    // Handle preflight requests
    const preflightResponse = security.handlePreflightRequest(request)
    if (preflightResponse) {
      return preflightResponse
    }

    // Process the actual request
    const response = await handler(request, context)

    // Apply security headers
    security.applySecurityHeaders(response, request)
    security.applyCORSHeaders(response, request)

    return response
  }
}

// Export singleton instances
export const defaultSecurity = new SecurityMiddleware()
export const widgetSecurity = new SecurityMiddleware(WIDGET_CORS_CONFIG)
export const apiSecurity = new SecurityMiddleware(API_CORS_CONFIG)