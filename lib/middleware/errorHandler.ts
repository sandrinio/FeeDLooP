/**
 * Error Handling Middleware
 * T088: Error handling and validation middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { DatabaseError } from '@/lib/database/supabase'
import { StorageError } from '@/lib/storage/minio'

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  STORAGE = 'STORAGE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  NETWORK = 'NETWORK_ERROR',
  INTERNAL = 'INTERNAL_SERVER_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  BAD_REQUEST = 'BAD_REQUEST_ERROR'
}

// Standardized error response format
export interface ErrorResponse {
  error: string
  code: ErrorType
  message: string
  details?: any
  timestamp: string
  requestId?: string
  path?: string
}

// Custom application error class
export class AppError extends Error {
  public readonly code: ErrorType
  public readonly statusCode: number
  public readonly details?: any
  public readonly isOperational: boolean

  constructor(
    message: string,
    code: ErrorType,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

// Error handler class
export class ErrorHandler {
  /**
   * Main error handling function for API routes
   */
  static handleError(error: unknown, request?: NextRequest): NextResponse {
    const requestId = request?.headers.get('x-request-id') || generateRequestId()
    const path = request?.nextUrl?.pathname

    // Log error for monitoring
    this.logError(error, requestId, path)

    // Handle different error types
    if (error instanceof AppError) {
      return this.createErrorResponse(
        error.message,
        error.code,
        error.statusCode,
        error.details,
        requestId,
        path
      )
    }

    if (error instanceof ZodError) {
      return this.handleValidationError(error, requestId, path)
    }

    if (error instanceof DatabaseError) {
      return this.handleDatabaseError(error, requestId, path)
    }

    if (error instanceof StorageError) {
      return this.handleStorageError(error, requestId, path)
    }

    if (error instanceof Error) {
      // Handle specific error messages
      if (error.message === 'Authentication required') {
        return this.createErrorResponse(
          'Authentication required',
          ErrorType.AUTHENTICATION,
          401,
          undefined,
          requestId,
          path
        )
      }

      if (error.message.includes('Access denied') || error.message.includes('access denied')) {
        return this.createErrorResponse(
          'Access denied',
          ErrorType.AUTHORIZATION,
          403,
          undefined,
          requestId,
          path
        )
      }

      if (error.message.includes('not found') || error.message.includes('Not found')) {
        return this.createErrorResponse(
          'Resource not found',
          ErrorType.NOT_FOUND,
          404,
          undefined,
          requestId,
          path
        )
      }

      // Generic error
      return this.createErrorResponse(
        'Internal server error',
        ErrorType.INTERNAL,
        500,
        { originalMessage: error.message },
        requestId,
        path
      )
    }

    // Unknown error type
    return this.createErrorResponse(
      'An unexpected error occurred',
      ErrorType.INTERNAL,
      500,
      undefined,
      requestId,
      path
    )
  }

  /**
   * Handle validation errors (Zod)
   */
  private static handleValidationError(
    error: ZodError,
    requestId: string,
    path?: string
  ): NextResponse {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))

    return this.createErrorResponse(
      'Validation failed',
      ErrorType.VALIDATION,
      400,
      { issues: details },
      requestId,
      path
    )
  }

  /**
   * Handle database errors
   */
  private static handleDatabaseError(
    error: DatabaseError,
    requestId: string,
    path?: string
  ): NextResponse {
    // Map database error codes to HTTP status codes
    const statusCodeMap: Record<string, number> = {
      'USER_EXISTS': 409,
      'USER_NOT_FOUND': 404,
      'PROJECT_NOT_FOUND': 404,
      'REPORT_NOT_FOUND': 404,
      'FILE_NOT_FOUND': 404,
      'VALIDATION_ERROR': 400,
      'PERMISSION_DENIED': 403,
      'FILE_TOO_LARGE': 413,
      'UNSUPPORTED_FILE_TYPE': 400,
      'CONTENT_TYPE_MISMATCH': 400
    }

    const statusCode = statusCodeMap[error.code] || 500

    return this.createErrorResponse(
      error.message,
      ErrorType.DATABASE,
      statusCode,
      { databaseCode: error.code },
      requestId,
      path
    )
  }

  /**
   * Handle storage errors
   */
  private static handleStorageError(
    error: StorageError,
    requestId: string,
    path?: string
  ): NextResponse {
    const statusCodeMap: Record<string, number> = {
      'UPLOAD_ERROR': 500,
      'DELETE_ERROR': 500,
      'ACCESS_ERROR': 403,
      'NOT_FOUND': 404,
      'QUOTA_EXCEEDED': 507
    }

    const statusCode = statusCodeMap[error.code] || 500

    return this.createErrorResponse(
      error.message,
      ErrorType.STORAGE,
      statusCode,
      { storageCode: error.code },
      requestId,
      path
    )
  }

  /**
   * Create standardized error response
   */
  private static createErrorResponse(
    message: string,
    code: ErrorType,
    statusCode: number,
    details?: any,
    requestId?: string,
    path?: string
  ): NextResponse {
    const errorResponse: ErrorResponse = {
      error: this.getErrorTitle(code),
      code,
      message,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
      ...(requestId && { requestId }),
      ...(path && { path })
    }

    return NextResponse.json(errorResponse, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...(requestId && { 'x-request-id': requestId })
      }
    })
  }

  /**
   * Get user-friendly error title
   */
  private static getErrorTitle(code: ErrorType): string {
    const titles: Record<ErrorType, string> = {
      [ErrorType.VALIDATION]: 'Validation Error',
      [ErrorType.AUTHENTICATION]: 'Authentication Error',
      [ErrorType.AUTHORIZATION]: 'Authorization Error',
      [ErrorType.DATABASE]: 'Database Error',
      [ErrorType.STORAGE]: 'Storage Error',
      [ErrorType.RATE_LIMIT]: 'Rate Limit Exceeded',
      [ErrorType.NETWORK]: 'Network Error',
      [ErrorType.INTERNAL]: 'Internal Server Error',
      [ErrorType.NOT_FOUND]: 'Not Found',
      [ErrorType.CONFLICT]: 'Conflict',
      [ErrorType.BAD_REQUEST]: 'Bad Request'
    }

    return titles[code] || 'Unknown Error'
  }

  /**
   * Log error for monitoring and debugging
   */
  private static logError(error: unknown, requestId: string, path?: string): void {
    const timestamp = new Date().toISOString()
    const errorInfo = {
      timestamp,
      requestId,
      path,
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: error instanceof AppError ? error.code : undefined
      }
    }

    // Log to console (in production, this would go to a logging service)
    console.error('API Error:', JSON.stringify(errorInfo, null, 2))

    // TODO: Send to monitoring service (e.g., Sentry, DataDog, etc.)
    // this.sendToMonitoringService(errorInfo)
  }
}

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return ErrorHandler.handleError(error, request)
    }
  }
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Common validation helpers
 */
export class ValidationHelper {
  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string, fieldName: string = 'ID'): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (!uuid || !uuidRegex.test(uuid)) {
      throw new AppError(
        `Invalid ${fieldName} format`,
        ErrorType.VALIDATION,
        400,
        { field: fieldName, value: uuid }
      )
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!email || !emailRegex.test(email)) {
      throw new AppError(
        'Invalid email format',
        ErrorType.VALIDATION,
        400,
        { field: 'email', value: email }
      )
    }
  }

  /**
   * Validate required field
   */
  static validateRequired(value: any, fieldName: string): void {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      throw new AppError(
        `${fieldName} is required`,
        ErrorType.VALIDATION,
        400,
        { field: fieldName }
      )
    }
  }

  /**
   * Validate string length
   */
  static validateStringLength(
    value: string,
    fieldName: string,
    minLength: number = 0,
    maxLength: number = Number.MAX_SAFE_INTEGER
  ): void {
    if (typeof value !== 'string') {
      throw new AppError(
        `${fieldName} must be a string`,
        ErrorType.VALIDATION,
        400,
        { field: fieldName, type: typeof value }
      )
    }

    if (value.length < minLength) {
      throw new AppError(
        `${fieldName} must be at least ${minLength} characters long`,
        ErrorType.VALIDATION,
        400,
        { field: fieldName, length: value.length, minLength }
      )
    }

    if (value.length > maxLength) {
      throw new AppError(
        `${fieldName} must be no more than ${maxLength} characters long`,
        ErrorType.VALIDATION,
        400,
        { field: fieldName, length: value.length, maxLength }
      )
    }
  }

  /**
   * Validate enum value
   */
  static validateEnum<T extends string>(
    value: string,
    fieldName: string,
    allowedValues: readonly T[]
  ): asserts value is T {
    if (!allowedValues.includes(value as T)) {
      throw new AppError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        ErrorType.VALIDATION,
        400,
        { field: fieldName, value, allowedValues }
      )
    }
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: string, limit?: string): {
    page: number
    limit: number
    offset: number
  } {
    const parsedPage = page ? parseInt(page, 10) : 1
    const parsedLimit = limit ? parseInt(limit, 10) : 20

    if (isNaN(parsedPage) || parsedPage < 1) {
      throw new AppError(
        'Page must be a positive integer',
        ErrorType.VALIDATION,
        400,
        { field: 'page', value: page }
      )
    }

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new AppError(
        'Limit must be between 1 and 100',
        ErrorType.VALIDATION,
        400,
        { field: 'limit', value: limit }
      )
    }

    return {
      page: parsedPage,
      limit: parsedLimit,
      offset: (parsedPage - 1) * parsedLimit
    }
  }
}

/**
 * Rate limiting error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, ErrorType.RATE_LIMIT, 429, { retryAfter })
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorType.AUTHENTICATION, 401)
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, ErrorType.AUTHORIZATION, 403)
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, ErrorType.NOT_FOUND, 404)
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, ErrorType.CONFLICT, 409)
  }
}

/**
 * Bad request error
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, ErrorType.BAD_REQUEST, 400)
  }
}