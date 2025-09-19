/**
 * Rate Limiting Utilities
 * Simple in-memory rate limiting for API endpoints
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

class InMemoryRateLimit {
  private store = new Map<string, RateLimitEntry>()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 5) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests

    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), this.windowMs)
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.store.get(identifier)

    if (!entry || now >= entry.resetTime) {
      // First request or window expired
      const resetTime = now + this.windowMs
      this.store.set(identifier, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime
      }
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }

    // Increment counter
    entry.count++
    this.store.set(identifier, entry)

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

// Rate limiters for different endpoints
export const authRateLimit = new InMemoryRateLimit(15 * 60 * 1000, 5) // 5 attempts per 15 minutes
export const registrationRateLimit = new InMemoryRateLimit(60 * 60 * 1000, 3) // 3 registrations per hour

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: Request): string {
  // In production, use more sophisticated identification
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return `${ip}_${request.headers.get('user-agent') || 'unknown'}`
}

/**
 * Rate limit middleware for API routes
 */
export function checkRateLimit(
  request: Request,
  rateLimit: InMemoryRateLimit,
  identifier?: string
): { allowed: boolean; headers: Record<string, string> } {
  const clientId = identifier || getClientIdentifier(request)
  const result = rateLimit.check(clientId)

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': rateLimit['maxRequests'].toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }

  if (!result.allowed) {
    headers['Retry-After'] = Math.ceil((result.resetTime - Date.now()) / 1000).toString()
  }

  return { allowed: result.allowed, headers }
}