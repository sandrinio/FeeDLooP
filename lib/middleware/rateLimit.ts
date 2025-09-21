/**
 * Rate Limiting Middleware for API Endpoints
 * T089: Rate limiting middleware for API endpoints in lib/middleware/rateLimit.ts
 */

import { NextRequest, NextResponse } from 'next/server'

// Rate limit configuration interfaces
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (request: NextRequest) => string
  onLimitReached?: (request: NextRequest, key: string) => void
}

export interface RateLimitResult {
  isAllowed: boolean
  remainingRequests: number
  resetTime: number
  totalRequests: number
}

export interface RateLimitStore {
  key: string
  requests: number
  resetTime: number
  firstRequest: number
}

// In-memory store for rate limiting (production should use Redis/database)
class MemoryStore {
  private store = new Map<string, RateLimitStore>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  get(key: string): RateLimitStore | undefined {
    return this.store.get(key)
  }

  set(key: string, value: RateLimitStore): void {
    this.store.set(key, value)
  }

  increment(key: string, windowMs: number): RateLimitStore {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || now > existing.resetTime) {
      // Create new window
      const newStore: RateLimitStore = {
        key,
        requests: 1,
        resetTime: now + windowMs,
        firstRequest: now
      }
      this.store.set(key, newStore)
      return newStore
    }

    // Increment existing
    existing.requests++
    this.store.set(key, existing)
    return existing
  }

  reset(key: string): void {
    this.store.delete(key)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, store] of this.store.entries()) {
      if (now > store.resetTime) {
        this.store.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }

  // Get statistics
  getStats(): { totalKeys: number; totalRequests: number } {
    let totalRequests = 0
    for (const store of this.store.values()) {
      totalRequests += store.requests
    }
    return {
      totalKeys: this.store.size,
      totalRequests
    }
  }
}

// Global store instance
const globalStore = new MemoryStore()

/**
 * Rate limiting middleware class
 */
export class RateLimitMiddleware {
  private config: Required<RateLimitConfig>
  private store: MemoryStore

  constructor(config: RateLimitConfig, store?: MemoryStore) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      message: config.message || 'Too many requests, please try again later',
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      onLimitReached: config.onLimitReached || (() => {})
    }
    this.store = store || globalStore
  }

  /**
   * Check if request is within rate limit
   */
  checkLimit(request: NextRequest): RateLimitResult {
    const key = this.config.keyGenerator(request)
    const store = this.store.increment(key, this.config.windowMs)

    const isAllowed = store.requests <= this.config.maxRequests
    const remainingRequests = Math.max(0, this.config.maxRequests - store.requests)

    if (!isAllowed) {
      this.config.onLimitReached(request, key)
    }

    return {
      isAllowed,
      remainingRequests,
      resetTime: store.resetTime,
      totalRequests: store.requests
    }
  }

  /**
   * Create middleware function
   */
  middleware() {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      const result = this.checkLimit(request)

      if (!result.isAllowed) {
        return this.createRateLimitResponse(result, request)
      }

      // Add rate limit headers for successful requests
      return this.addRateLimitHeaders(null, result)
    }
  }

  /**
   * Wrapper for API route handlers
   */
  wrap<T extends any[]>(
    handler: (...args: T) => Promise<NextResponse>
  ) {
    return async (...args: T): Promise<NextResponse> => {
      const request = args.find(arg => arg instanceof NextRequest) as NextRequest | undefined

      if (!request) {
        throw new Error('Request object not found in arguments')
      }

      const result = this.checkLimit(request)

      if (!result.isAllowed) {
        return this.createRateLimitResponse(result, request)
      }

      try {
        const response = await handler(...args)
        return this.addRateLimitHeaders(response, result)
      } catch (error) {
        // Don't count failed requests towards rate limit if configured
        if (this.config.skipFailedRequests) {
          const key = this.config.keyGenerator(request)
          const store = this.store.get(key)
          if (store && store.requests > 0) {
            store.requests--
            this.store.set(key, store)
          }
        }
        throw error
      }
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.store.reset(key)
  }

  /**
   * Get current usage for a key
   */
  getUsage(request: NextRequest): RateLimitStore | undefined {
    const key = this.config.keyGenerator(request)
    return this.store.get(key)
  }

  /**
   * Default key generator - uses IP address
   */
  private defaultKeyGenerator(request: NextRequest): string {
    // Try to get real IP from headers (behind proxy)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare

    let ip = forwarded?.split(',')[0] || realIp || cfConnectingIp

    // Fallback to request IP if available
    if (!ip && (request as any).ip) {
      ip = (request as any).ip
    }

    // Final fallback
    if (!ip) {
      ip = '127.0.0.1'
    }

    return `ratelimit:${ip.trim()}`
  }

  /**
   * Create rate limit exceeded response
   */
  private createRateLimitResponse(result: RateLimitResult, request: NextRequest): NextResponse {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

    const response = NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: this.config.message,
          details: {
            limit: this.config.maxRequests,
            remaining: result.remainingRequests,
            resetTime: result.resetTime,
            retryAfter
          }
        },
        timestamp: new Date().toISOString()
      },
      { status: 429 }
    )

    // Add standard rate limit headers
    response.headers.set('X-RateLimit-Limit', this.config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', result.remainingRequests.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
    response.headers.set('Retry-After', retryAfter.toString())

    return response
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(response: NextResponse | null, result: RateLimitResult): NextResponse {
    const headers = new Headers(response?.headers)

    headers.set('X-RateLimit-Limit', this.config.maxRequests.toString())
    headers.set('X-RateLimit-Remaining', result.remainingRequests.toString())
    headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())

    if (response) {
      // Clone response with new headers
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
    }

    // Return empty response with headers (for middleware)
    return new NextResponse(null, { headers })
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
  // Strict rate limiting for authentication endpoints
  auth: new RateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true
  }),

  // Standard API rate limiting
  api: new RateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'API rate limit exceeded, please slow down'
  }),

  // Widget submission rate limiting (more permissive)
  widget: new RateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 submissions per minute
    message: 'Too many submissions, please wait before submitting again'
  }),

  // File upload rate limiting
  upload: new RateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads per minute
    message: 'Too many file uploads, please wait before uploading again'
  }),

  // Export rate limiting (very restrictive)
  export: new RateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 exports per hour
    message: 'Export rate limit exceeded, please try again later'
  }),

  // Admin operations
  admin: new RateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute for admins
    message: 'Admin rate limit exceeded'
  })
}

/**
 * Create custom rate limiter with user-based key
 */
export function createUserRateLimit(config: Omit<RateLimitConfig, 'keyGenerator'>) {
  return new RateLimitMiddleware({
    ...config,
    keyGenerator: (request: NextRequest) => {
      // Extract user ID from session or auth header
      const authHeader = request.headers.get('authorization')
      if (authHeader) {
        // This would extract user ID from JWT token
        // For now, use a placeholder
        return `user:${authHeader.slice(-10)}`
      }

      // Fallback to IP-based limiting
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded?.split(',')[0] || '127.0.0.1'
      return `ip:${ip.trim()}`
    }
  })
}

/**
 * Create project-based rate limiter
 */
export function createProjectRateLimit(config: Omit<RateLimitConfig, 'keyGenerator'>) {
  return new RateLimitMiddleware({
    ...config,
    keyGenerator: (request: NextRequest) => {
      // Extract project ID from URL path or body
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')

      // Look for project ID in path (e.g., /api/projects/{id}/...)
      const projectIndex = pathParts.indexOf('projects')
      if (projectIndex !== -1 && projectIndex + 1 < pathParts.length) {
        const projectId = pathParts[projectIndex + 1]
        if (projectId && projectId.length > 10) {
          return `project:${projectId}`
        }
      }

      // Fallback to IP-based limiting
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded?.split(',')[0] || '127.0.0.1'
      return `ip:${ip.trim()}`
    }
  })
}

/**
 * Utility functions
 */
export function getRateLimitStats(): { totalKeys: number; totalRequests: number } {
  return globalStore.getStats()
}

export function resetUserRateLimit(userId: string): void {
  globalStore.reset(`user:${userId}`)
}

export function resetIPRateLimit(ip: string): void {
  globalStore.reset(`ratelimit:${ip}`)
}

/**
 * Middleware factory functions for easy use
 */
export const withRateLimit = (config: RateLimitConfig) => {
  const limiter = new RateLimitMiddleware(config)
  return limiter.wrap.bind(limiter)
}

export const withAuthRateLimit = RateLimiters.auth.wrap.bind(RateLimiters.auth)
export const withAPIRateLimit = RateLimiters.api.wrap.bind(RateLimiters.api)
export const withWidgetRateLimit = RateLimiters.widget.wrap.bind(RateLimiters.widget)
export const withUploadRateLimit = RateLimiters.upload.wrap.bind(RateLimiters.upload)
export const withExportRateLimit = RateLimiters.export.wrap.bind(RateLimiters.export)
export const withAdminRateLimit = RateLimiters.admin.wrap.bind(RateLimiters.admin)

/**
 * Express-style middleware for Next.js Edge Runtime
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  const limiter = new RateLimitMiddleware(config)

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const result = limiter.checkLimit(request)

    if (!result.isAllowed) {
      return limiter['createRateLimitResponse'](result, request)
    }

    return null // Continue to next middleware/handler
  }
}

/**
 * Health check for rate limiting system
 */
export function rateLimitHealthCheck(): {
  status: 'healthy' | 'degraded' | 'unhealthy'
  stats: { totalKeys: number; totalRequests: number }
  timestamp: string
} {
  try {
    const stats = getRateLimitStats()

    // Consider unhealthy if too many rate limit entries (potential memory leak)
    const status = stats.totalKeys > 10000 ? 'degraded' : 'healthy'

    return {
      status,
      stats,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      stats: { totalKeys: 0, totalRequests: 0 },
      timestamp: new Date().toISOString()
    }
  }
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    globalStore.destroy()
  })

  process.on('SIGINT', () => {
    globalStore.destroy()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    globalStore.destroy()
    process.exit(0)
  })
}

export default RateLimitMiddleware