/**
 * Validation Middleware
 * T088: Error handling and validation middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import { AppError, ErrorType, ValidationHelper } from './errorHandler'

// Validation target types
export type ValidationTarget = 'body' | 'query' | 'params' | 'headers'

// Validation configuration
export interface ValidationConfig {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
  headers?: ZodSchema
  options?: {
    stripUnknown?: boolean
    abortEarly?: boolean
  }
}

// Validated request data
export interface ValidatedData {
  body?: any
  query?: any
  params?: any
  headers?: any
}

/**
 * Validation middleware class
 */
export class ValidationMiddleware {
  /**
   * Validate request data against schemas
   */
  static async validateRequest(
    request: NextRequest,
    config: ValidationConfig,
    context?: any
  ): Promise<ValidatedData> {
    const validatedData: ValidatedData = {}

    try {
      // Validate body
      if (config.body) {
        const body = await this.extractBody(request)
        validatedData.body = config.body.parse(body)
      }

      // Validate query parameters
      if (config.query) {
        const query = this.extractQuery(request)
        validatedData.query = config.query.parse(query)
      }

      // Validate route parameters
      if (config.params && context?.params) {
        const params = await context.params
        validatedData.params = config.params.parse(params)
      }

      // Validate headers
      if (config.headers) {
        const headers = this.extractHeaders(request)
        validatedData.headers = config.headers.parse(headers)
      }

      return validatedData

    } catch (error) {
      if (error instanceof ZodError) {
        throw error // Will be handled by error handler
      }
      throw new AppError(
        'Validation failed',
        ErrorType.VALIDATION,
        400,
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    }
  }

  /**
   * Create validation wrapper for API routes
   */
  static withValidation(
    config: ValidationConfig,
    handler: (request: NextRequest, validatedData: ValidatedData, context?: any) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const validatedData = await this.validateRequest(request, config, context)
      return handler(request, validatedData, context)
    }
  }

  /**
   * Extract and parse request body
   */
  private static async extractBody(request: NextRequest): Promise<any> {
    const contentType = request.headers.get('content-type') || ''

    try {
      if (contentType.includes('application/json')) {
        return await request.json()
      }

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        const body: Record<string, any> = {}

        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            body[key] = value
          } else {
            // Handle multiple values for the same key
            if (body[key]) {
              if (Array.isArray(body[key])) {
                body[key].push(value)
              } else {
                body[key] = [body[key], value]
              }
            } else {
              body[key] = value
            }
          }
        }

        return body
      }

      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData()
        const body: Record<string, any> = {}

        for (const [key, value] of formData.entries()) {
          body[key] = value
        }

        return body
      }

      // For other content types or empty body
      const text = await request.text()
      return text ? text : {}

    } catch (error) {
      throw new AppError(
        'Invalid request body format',
        ErrorType.VALIDATION,
        400,
        { contentType, error: error instanceof Error ? error.message : String(error) }
      )
    }
  }

  /**
   * Extract query parameters
   */
  private static extractQuery(request: NextRequest): Record<string, any> {
    const { searchParams } = request.nextUrl
    const query: Record<string, any> = {}

    for (const [key, value] of searchParams.entries()) {
      // Handle multiple values for the same parameter
      if (query[key]) {
        if (Array.isArray(query[key])) {
          query[key].push(value)
        } else {
          query[key] = [query[key], value]
        }
      } else {
        query[key] = value
      }
    }

    return query
  }

  /**
   * Extract relevant headers
   */
  private static extractHeaders(request: NextRequest): Record<string, any> {
    const headers: Record<string, any> = {}

    // Extract commonly validated headers
    const relevantHeaders = [
      'authorization',
      'content-type',
      'user-agent',
      'x-api-key',
      'x-request-id',
      'x-forwarded-for',
      'accept',
      'origin'
    ]

    relevantHeaders.forEach(header => {
      const value = request.headers.get(header)
      if (value) {
        headers[header.replace(/-/g, '_')] = value
      }
    })

    return headers
  }
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Email validation
  email: z.string().email('Invalid email format'),

  // Pagination parameters
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
    offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0)
  }).refine(data => data.page >= 1, { message: 'Page must be >= 1', path: ['page'] })
    .refine(data => data.limit >= 1 && data.limit <= 100, { message: 'Limit must be between 1 and 100', path: ['limit'] }),

  // Sort parameters
  sort: z.object({
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).default('desc')
  }),

  // Date range
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  }).refine(data => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to)
    }
    return true
  }, { message: 'From date must be before to date' }),

  // File upload validation
  fileUpload: z.object({
    file: z.instanceof(File, 'File is required'),
    project_id: z.string().uuid('Invalid project ID'),
    report_id: z.string().uuid('Invalid report ID').optional(),
    description: z.string().max(500, 'Description too long').optional()
  }),

  // Authentication header
  authHeader: z.object({
    authorization: z.string().regex(/^Bearer\s+.+/, 'Invalid authorization header format')
  }),

  // Content type validation
  jsonContentType: z.object({
    content_type: z.string().includes('application/json', 'Content-Type must be application/json')
  })
}

/**
 * Project-specific validation schemas
 */
export const ProjectSchemas = {
  // Project creation
  createProject: z.object({
    name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    integration_key: z.string().min(10, 'Integration key too short').optional(),
    settings: z.object({
      allow_anonymous_reports: z.boolean().default(true),
      require_email: z.boolean().default(false),
      auto_assign: z.boolean().default(false)
    }).optional()
  }),

  // Project update
  updateProject: z.object({
    name: z.string().min(1, 'Project name is required').max(100, 'Project name too long').optional(),
    description: z.string().max(500, 'Description too long').optional(),
    settings: z.object({
      allow_anonymous_reports: z.boolean(),
      require_email: z.boolean(),
      auto_assign: z.boolean()
    }).partial().optional()
  }),

  // Project query filters
  projectFilters: z.object({
    status: z.enum(['active', 'archived']).optional(),
    search: z.string().max(100, 'Search term too long').optional()
  }).merge(CommonSchemas.pagination).merge(CommonSchemas.sort)
}

/**
 * Report-specific validation schemas
 */
export const ReportSchemas = {
  // Report creation
  createReport: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().min(1, 'Description is required').max(10000, 'Description too long'),
    type: z.enum(['bug', 'initiative', 'feedback'], { errorMap: () => ({ message: 'Invalid report type' }) }),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    reporter_email: z.string().email('Invalid email').optional(),
    reporter_name: z.string().max(100, 'Name too long').optional(),
    url: z.string().url('Invalid URL').optional(),
    user_agent: z.string().max(500, 'User agent too long').optional(),
    console_logs: z.array(z.any()).optional(),
    network_requests: z.array(z.any()).optional(),
    attachments: z.array(z.object({
      filename: z.string().min(1, 'Filename required'),
      content_type: z.string().min(1, 'Content type required'),
      size: z.number().positive('File size must be positive'),
      base64_data: z.string().min(1, 'File data required')
    })).max(5, 'Maximum 5 attachments allowed').optional()
  }),

  // Report update
  updateReport: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
    description: z.string().min(1, 'Description is required').max(10000, 'Description too long').optional(),
    status: z.enum(['active', 'archived']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    type: z.enum(['bug', 'initiative', 'feedback']).optional()
  }),

  // Report query filters
  reportFilters: z.object({
    type: z.enum(['bug', 'initiative', 'feedback']).optional(),
    status: z.enum(['active', 'archived']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    search: z.string().max(100, 'Search term too long').optional(),
    reporter_email: z.string().email('Invalid email').optional()
  }).merge(CommonSchemas.pagination).merge(CommonSchemas.sort).merge(CommonSchemas.dateRange)
}

/**
 * User-specific validation schemas
 */
export const UserSchemas = {
  // User registration
  register: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    company: z.string().max(100, 'Company name too long').optional()
  }),

  // User login
  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  }),

  // User profile update
  updateProfile: z.object({
    first_name: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
    last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
    company: z.string().max(100, 'Company name too long').optional(),
    avatar_url: z.string().url('Invalid avatar URL').optional()
  }),

  // Password change
  changePassword: z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'New password must be at least 8 characters')
  })
}

/**
 * Invitation-specific validation schemas
 */
export const InvitationSchemas = {
  // Send invitation
  sendInvitation: z.object({
    email: z.string().email('Invalid email format'),
    role: z.enum(['member', 'admin']).default('member'),
    can_invite: z.boolean().default(false)
  }),

  // Accept invitation
  acceptInvitation: z.object({
    token: z.string().min(1, 'Invitation token is required'),
    user_data: UserSchemas.register.omit({ email: true }).optional()
  })
}

/**
 * Export-specific validation schemas
 */
export const ExportSchemas = {
  // Export parameters
  exportParams: z.object({
    format: z.enum(['csv']).default('csv'),
    template: z.enum(['default', 'jira', 'azure']).default('default'),
    include_attachments: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
    include_diagnostic: z.enum(['true', 'false']).default('false').transform(val => val === 'true')
  }).merge(ReportSchemas.reportFilters.pick({
    type: true,
    status: true,
    priority: true
  })).merge(CommonSchemas.dateRange)
}

/**
 * Helper function to create route parameter validation
 */
export function createParamsSchema(paramNames: string[]): ZodSchema {
  const schema: Record<string, ZodSchema> = {}

  paramNames.forEach(name => {
    if (name === 'id' || name.endsWith('Id')) {
      schema[name] = CommonSchemas.uuid
    } else {
      schema[name] = z.string().min(1, `${name} is required`)
    }
  })

  return z.object(schema)
}

/**
 * Middleware factory functions
 */
export const withValidation = ValidationMiddleware.withValidation
export const validateRequest = ValidationMiddleware.validateRequest