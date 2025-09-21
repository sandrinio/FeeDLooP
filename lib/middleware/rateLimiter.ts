/**
 * Rate Limiting Middleware
 * T089: Rate limiting middleware for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimitError } from './errorHandler'

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
  keyGenerator?: (request: NextRequest) => string // Custom key generation
  onLimitReached?: (request: NextRequest, key: string) => void // Callback when limit is reached
  headers?: boolean // Include rate limit headers in response
  message?: string // Custom error message
}

// Rate limit entry
interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequestTime: number
}

// Rate limiter storage (in-memory for single instance, would use Redis in production)
class RateLimitStorage {
  private storage = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  get(key: string): RateLimitEntry | undefined {
    return this.storage.get(key)
  }

  set(key: string, entry: RateLimitEntry): void {
    this.storage.set(key, entry)
  }

  delete(key: string): void {
    this.storage.delete(key)
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now()
    const existing = this.storage.get(key)

    if (existing && now < existing.resetTime) {
      // Within the same window, increment count
      existing.count++
      return existing
    } else {
      // New window or first request
      const entry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        firstRequestTime: now
      }
      this.storage.set(key, entry)
      return entry
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.storage.entries()) {
      if (now >= entry.resetTime) {
        this.storage.delete(key)
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.storage.clear()
  }
}

// Global storage instance
const rateLimitStorage = new RateLimitStorage()

/**
 * Rate limiter class
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
      skipFailedRequests: config.skipFailedRequests ?? false,
      keyGenerator: config.keyGenerator ?? this.defaultKeyGenerator,
      onLimitReached: config.onLimitReached ?? (() => {}),
      headers: config.headers ?? true,
      message: config.message ?? 'Too many requests, please try again later'
    }
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(request: NextRequest): Promise<{
    allowed: boolean
    limit: number
    remaining: number
    resetTime: number
    retryAfter?: number
  }> {
    const key = this.config.keyGenerator(request)
    const entry = rateLimitStorage.increment(key, this.config.windowMs)

    const allowed = entry.count <= this.config.maxRequests
    const remaining = Math.max(0, this.config.maxRequests - entry.count)
    const retryAfter = allowed ? undefined : Math.ceil((entry.resetTime - Date.now()) / 1000)

    if (!allowed) {
      this.config.onLimitReached(request, key)
    }

    return {
      allowed,
      limit: this.config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter
    }
  }

  /**
   * Create rate limiting middleware
   */
  middleware() {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      const result = await this.checkLimit(request)

      if (!result.allowed) {
        const response = NextResponse.json(
          {
            error: 'Rate Limit Exceeded',
            message: this.config.message,
            retryAfter: result.retryAfter
          },
          { status: 429 }
        )

        if (this.config.headers) {
          this.addRateLimitHeaders(response, result)
        }

        return response
      }

      return null // Allow request to continue
    }
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(
    response: NextResponse,
    result: { limit: number; remaining: number; resetTime: number; retryAfter?: number }
  ): void {
    response.headers.set('X-RateLimit-Limit', result.limit.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())

    if (result.retryAfter) {
      response.headers.set('Retry-After', result.retryAfter.toString())
    }
  }

  /**
   * Default key generator based on IP address
   */
  private defaultKeyGenerator(request: NextRequest): string {
    // Try to get real IP from various headers
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')

    let ip = 'unknown'

    if (forwarded) {
      ip = forwarded.split(',')[0].trim()
    } else if (realIp) {
      ip = realIp
    } else if (cfConnectingIp) {
      ip = cfConnectingIp
    }

    return `ip:${ip}`
  }
}

/**
 * Rate limiting wrapper for API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  const rateLimiter = new RateLimiter(config)

  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    // Check rate limit
    const limitResponse = await rateLimiter.middleware()(request)
    if (limitResponse) {
      return limitResponse
    }

    // Proceed with handler
    const response = await handler(request, context)

    // Add rate limit headers to successful responses
    if (config.headers !== false) {
      const result = await rateLimiter.checkLimit(request)
      response.headers.set('X-RateLimit-Limit', result.limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
    }

    return response
  }
}

/**
 * Predefined rate limiting configurations
 */
export const RateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later'
  },

  // Moderate rate limiting for API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'API rate limit exceeded, please slow down'
  },

  // Lenient rate limiting for file uploads
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
    message: 'Upload rate limit exceeded, please wait before uploading more files'
  },

  // Very strict rate limiting for user registration
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 registrations per hour per IP
    message: 'Too many registration attempts, please try again later'
  },

  // Moderate rate limiting for password reset
  passwordReset: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3, // 3 password reset attempts per 15 minutes
    message: 'Too many password reset attempts, please try again later'
  },

  // Lenient rate limiting for general API usage
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Rate limit exceeded, please slow down'
  },

  // Strict rate limiting for export operations
  export: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 exports per minute
    message: 'Export rate limit exceeded, please wait before requesting another export'
  },

  // Very lenient rate limiting for widget endpoints (anonymous users)
  widget: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200, // 200 requests per minute (for high-traffic widgets)
    message: 'Widget rate limit exceeded'
  }
}

/**
 * User-based rate limiting (requires authentication)
 */
export function createUserRateLimiter(config: RateLimitConfig) {
  return new RateLimiter({
    ...config,
    keyGenerator: (request: NextRequest) => {
      // Try to extract user ID from authorization header or session
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          // This would normally decode the JWT to get user ID
          // For now, use the token as the key
          const token = authHeader.substring(7)
          return `user:${token.substring(0, 10)}` // Use first 10 chars of token
        } catch (error) {
          // Fall back to IP-based limiting
          return `ip:${request.headers.get('x-forwarded-for') || 'unknown'}`
        }
      }

      // Fall back to IP-based limiting for unauthenticated requests
      return `ip:${request.headers.get('x-forwarded-for') || 'unknown'}`
    }
  })
}

/**
 * Project-based rate limiting
 */
export function createProjectRateLimiter(config: RateLimitConfig) {
  return new RateLimiter({
    ...config,
    keyGenerator: (request: NextRequest) => {
      // Extract project ID from URL or body
      const url = request.nextUrl.pathname
      const projectIdMatch = url.match(/\/projects\/([^\/]+)/)

      if (projectIdMatch) {
        const projectId = projectIdMatch[1]
        return `project:${projectId}`
      }

      // Fall back to IP-based limiting
      return `ip:${request.headers.get('x-forwarded-for') || 'unknown'}`
    }
  })
}

/**
 * Combined rate limiter (multiple limits)
 */
export class CombinedRateLimiter {
  private limiters: { name: string; limiter: RateLimiter }[]

  constructor(configs: { name: string; config: RateLimitConfig }[]) {
    this.limiters = configs.map(({ name, config }) => ({
      name,
      limiter: new RateLimiter(config)
    }))
  }

  async checkAllLimits(request: NextRequest): Promise<{
    allowed: boolean
    limitedBy?: string
    retryAfter?: number
  }> {
    for (const { name, limiter } of this.limiters) {
      const result = await limiter.checkLimit(request)
      if (!result.allowed) {
        return {
          allowed: false,
          limitedBy: name,
          retryAfter: result.retryAfter
        }
      }
    }

    return { allowed: true }
  }

  middleware() {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      const result = await this.checkAllLimits(request)

      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'Rate Limit Exceeded',
            message: `Rate limit exceeded (${result.limitedBy})`,
            retryAfter: result.retryAfter
          },
          { status: 429 }
        )
      }

      return null
    }
  }
}

/**
 * Rate limiting based on request size (for uploads)
 */
export function createSizeBasedRateLimiter(
  maxSizePerWindow: number, // bytes
  windowMs: number = 60 * 1000 // 1 minute
) {
  const sizeTracking = new Map<string, { totalSize: number; resetTime: number }>()

  return {
    checkSizeLimit: (request: NextRequest, requestSize: number): boolean => {
      const key = request.headers.get('x-forwarded-for') || 'unknown'
      const now = Date.now()

      const existing = sizeTracking.get(key)
      if (existing && now < existing.resetTime) {
        existing.totalSize += requestSize
        return existing.totalSize <= maxSizePerWindow
      } else {
        sizeTracking.set(key, {
          totalSize: requestSize,
          resetTime: now + windowMs
        })
        return requestSize <= maxSizePerWindow
      }
    }
  }
}

// Cleanup function for graceful shutdown
export function cleanupRateLimitStorage(): void {
  rateLimitStorage.destroy()
}

// Export common rate limiters
export const authRateLimiter = new RateLimiter(RateLimitConfigs.auth)
export const apiRateLimiter = new RateLimiter(RateLimitConfigs.api)
export const uploadRateLimiter = new RateLimiter(RateLimitConfigs.upload)
export const widgetRateLimiter = new RateLimiter(RateLimitConfigs.widget)