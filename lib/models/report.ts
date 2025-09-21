/**
 * Report Data Model with Zod Validation
 * T040: Report data model with Zod validation in lib/models/report.ts
 */

import { z } from 'zod'

// Report Type Enum
export const ReportTypeSchema = z.enum(['bug', 'initiative', 'feedback'])
export type ReportType = z.infer<typeof ReportTypeSchema>

// Report Status Enum
export const ReportStatusSchema = z.enum(['active', 'archived'])
export type ReportStatus = z.infer<typeof ReportStatusSchema>

// Report Priority Enum
export const ReportPrioritySchema = z.enum(['low', 'medium', 'high', 'critical'])
export type ReportPriority = z.infer<typeof ReportPrioritySchema>

// User Info Schema (from widget submissions)
export const UserInfoSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional()
    .nullable(),

  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .nullable(),

  browser: z.string()
    .max(200, 'Browser info must be less than 200 characters')
    .optional()
    .nullable(),

  os: z.string()
    .max(100, 'OS info must be less than 100 characters')
    .optional()
    .nullable(),

  url: z.string()
    .url('Invalid URL')
    .max(2000, 'URL must be less than 2000 characters')
    .optional()
    .nullable(),

  screen_resolution: z.string()
    .regex(/^\d+x\d+$/, 'Invalid screen resolution format (should be WIDTHxHEIGHT)')
    .optional()
    .nullable(),

  ip_address: z.string()
    .regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address')
    .optional()
    .nullable()
})

// Diagnostic Data Schema (for bug reports)
export const DiagnosticDataSchema = z.object({
  user_agent: z.string()
    .max(500, 'User agent must be less than 500 characters')
    .optional()
    .nullable(),

  timestamp: z.string()
    .datetime()
    .optional()
    .nullable(),

  page_url: z.string()
    .url('Invalid page URL')
    .max(2000, 'Page URL must be less than 2000 characters')
    .optional()
    .nullable(),

  referrer: z.string()
    .url('Invalid referrer URL')
    .max(2000, 'Referrer URL must be less than 2000 characters')
    .optional()
    .nullable(),

  console_errors: z.array(z.string().max(1000))
    .max(50, 'Maximum 50 console errors')
    .optional()
    .default([]),

  network_requests: z.array(z.object({
    url: z.string().max(2000),
    method: z.string().max(10),
    status: z.number().int().min(100).max(599),
    timestamp: z.string().datetime(),
    duration: z.number().optional()
  }))
    .max(100, 'Maximum 100 network requests')
    .optional()
    .default([]),

  local_storage: z.record(z.string(), z.string())
    .optional(),

  session_storage: z.record(z.string(), z.string())
    .optional(),

  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }).optional(),

  device: z.object({
    type: z.enum(['desktop', 'mobile', 'tablet']).optional(),
    touch: z.boolean().optional(),
    orientation: z.enum(['portrait', 'landscape']).optional()
  }).optional()
})

// Attachment Reference Schema (for widget submissions)
export const AttachmentReferenceSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters')
    .regex(/^[^<>:"/\\|?*]+\.[a-zA-Z0-9]+$/, 'Invalid filename format'),

  content_type: z.string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/, 'Invalid content type'),

  size: z.number()
    .int()
    .positive()
    .max(5 * 1024 * 1024, 'File size must be less than 5MB'),

  base64_data: z.string()
    .min(1, 'File data is required')
    .optional() // Optional because it might be processed separately
})

// Widget Report Creation Schema (for /api/widget/submit)
export const CreateWidgetReportSchema = z.object({
  project_key: z.string()
    .regex(/^[a-zA-Z0-9]{16,32}$/, 'Invalid project key format'),

  type: ReportTypeSchema,

  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),

  description: z.string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters'),

  user_info: UserInfoSchema
    .optional()
    .nullable(),

  diagnostic_data: DiagnosticDataSchema
    .optional()
    .nullable(),

  attachments: z.array(AttachmentReferenceSchema)
    .max(5, 'Maximum 5 attachments per report')
    .optional()
    .default([])
})

// Dashboard Report Creation Schema (for authenticated users)
export const CreateReportSchema = z.object({
  type: ReportTypeSchema,

  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),

  description: z.string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters'),

  priority: ReportPrioritySchema
    .optional(),

  user_info: UserInfoSchema
    .optional(),

  diagnostic_data: DiagnosticDataSchema
    .optional(),

  internal_notes: z.string()
    .max(2000, 'Internal notes must be less than 2000 characters')
    .optional()
    .nullable()
})

// Report Update Schema
export const UpdateReportSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),

  description: z.string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),

  status: ReportStatusSchema
    .optional(),

  priority: ReportPrioritySchema
    .optional(),

  internal_notes: z.string()
    .max(2000, 'Internal notes must be less than 2000 characters')
    .optional()
    .nullable(),

  resolution_notes: z.string()
    .max(2000, 'Resolution notes must be less than 2000 characters')
    .optional()
    .nullable(),

  assigned_to: z.string()
    .uuid('Invalid user ID format')
    .optional()
    .nullable()
})

// Full Report Schema (database representation)
export const ReportSchema = z.object({
  id: z.string()
    .uuid('Invalid report ID format'),

  project_id: z.string()
    .uuid('Invalid project ID format'),

  type: ReportTypeSchema,

  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),

  description: z.string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters'),

  status: ReportStatusSchema
    .default('active'),

  priority: ReportPrioritySchema
    .default('medium'),

  user_info: UserInfoSchema
    .nullable()
    .optional(),

  diagnostic_data: DiagnosticDataSchema
    .nullable()
    .optional(),

  internal_notes: z.string()
    .max(2000, 'Internal notes must be less than 2000 characters')
    .nullable()
    .optional(),

  resolution_notes: z.string()
    .max(2000, 'Resolution notes must be less than 2000 characters')
    .nullable()
    .optional(),

  assigned_to: z.string()
    .uuid('Invalid user ID format')
    .nullable()
    .optional(),

  created_by: z.string()
    .uuid('Invalid user ID format')
    .nullable()
    .optional(), // Null for widget submissions

  created_at: z.date(),

  updated_at: z.date(),

  resolved_at: z.date()
    .nullable()
    .optional()
})

// Report with Attachments Schema
export const ReportWithAttachmentsSchema = ReportSchema.extend({
  attachments: z.array(z.object({
    id: z.string().uuid(),
    filename: z.string(),
    content_type: z.string(),
    size: z.number().int(),
    url: z.string().url(),
    created_at: z.date()
  })).default([])
})

// Report List Item Schema (for report listings)
export const ReportListItemSchema = ReportSchema.pick({
  id: true,
  type: true,
  title: true,
  status: true,
  priority: true,
  created_at: true,
  updated_at: true
}).extend({
  attachment_count: z.number().int().nonnegative().default(0),
  user_name: z.string().nullable().optional(),
  user_email: z.string().email().nullable().optional()
})

// Report Filters Schema
export const ReportFiltersSchema = z.object({
  type: ReportTypeSchema
    .optional(),

  status: ReportStatusSchema
    .optional(),

  priority: ReportPrioritySchema
    .optional(),

  from_date: z.string()
    .datetime()
    .optional(),

  to_date: z.string()
    .datetime()
    .optional(),

  search: z.string()
    .max(100, 'Search term must be less than 100 characters')
    .optional(),

  assigned_to: z.string()
    .uuid()
    .optional(),

  page: z.number()
    .int()
    .positive()
    .default(1),

  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  sort_by: z.enum(['created_at', 'updated_at', 'priority', 'status', 'title'])
    .default('created_at'),

  sort_order: z.enum(['asc', 'desc'])
    .default('desc')
})

// Batch Update Schema
export const BatchUpdateReportsSchema = z.object({
  report_ids: z.array(z.string().uuid())
    .min(1, 'At least one report ID is required')
    .max(50, 'Maximum 50 reports per batch'),

  updates: z.object({
    status: ReportStatusSchema.optional(),
    priority: ReportPrioritySchema.optional(),
    assigned_to: z.string().uuid().nullable().optional()
  })
})

// Type exports
export type CreateWidgetReport = z.infer<typeof CreateWidgetReportSchema>
export type CreateReport = z.infer<typeof CreateReportSchema>
export type UpdateReport = z.infer<typeof UpdateReportSchema>
export type Report = z.infer<typeof ReportSchema>
export type ReportWithAttachments = z.infer<typeof ReportWithAttachmentsSchema>
export type ReportListItem = z.infer<typeof ReportListItemSchema>
export type ReportFilters = z.infer<typeof ReportFiltersSchema>
export type BatchUpdateReports = z.infer<typeof BatchUpdateReportsSchema>
export type UserInfo = z.infer<typeof UserInfoSchema>
export type DiagnosticData = z.infer<typeof DiagnosticDataSchema>
export type AttachmentReference = z.infer<typeof AttachmentReferenceSchema>

// Validation functions
export const validateCreateWidgetReport = (data: unknown) => CreateWidgetReportSchema.parse(data)
export const validateCreateReport = (data: unknown) => CreateReportSchema.parse(data)
export const validateUpdateReport = (data: unknown) => UpdateReportSchema.parse(data)
export const validateReport = (data: unknown) => ReportSchema.parse(data)
export const validateReportWithAttachments = (data: unknown) => ReportWithAttachmentsSchema.parse(data)
export const validateReportListItem = (data: unknown) => ReportListItemSchema.parse(data)
export const validateReportFilters = (data: unknown) => ReportFiltersSchema.parse(data)
export const validateBatchUpdateReports = (data: unknown) => BatchUpdateReportsSchema.parse(data)

// Safe validation functions
export const safeValidateCreateWidgetReport = (data: unknown) => CreateWidgetReportSchema.safeParse(data)
export const safeValidateCreateReport = (data: unknown) => CreateReportSchema.safeParse(data)
export const safeValidateUpdateReport = (data: unknown) => UpdateReportSchema.safeParse(data)
export const safeValidateReport = (data: unknown) => ReportSchema.safeParse(data)
export const safeValidateReportWithAttachments = (data: unknown) => ReportWithAttachmentsSchema.safeParse(data)
export const safeValidateReportListItem = (data: unknown) => ReportListItemSchema.safeParse(data)
export const safeValidateReportFilters = (data: unknown) => ReportFiltersSchema.safeParse(data)
export const safeValidateBatchUpdateReports = (data: unknown) => BatchUpdateReportsSchema.safeParse(data)

// Helper functions
export const getDefaultPriorityForType = (type: ReportType): ReportPriority => {
  switch (type) {
    case 'bug':
      return 'medium'
    case 'initiative':
      return 'low'
    case 'feedback':
      return 'low'
    default:
      return 'medium'
  }
}

export const getReportStatusColor = (status: ReportStatus): string => {
  switch (status) {
    case 'active':
      return 'blue'
    case 'archived':
      return 'gray'
    default:
      return 'gray'
  }
}

export const getReportPriorityColor = (priority: ReportPriority): string => {
  switch (priority) {
    case 'low':
      return 'green'
    case 'medium':
      return 'yellow'
    case 'high':
      return 'orange'
    case 'critical':
      return 'red'
    default:
      return 'gray'
  }
}

export const getReportTypeIcon = (type: ReportType): string => {
  switch (type) {
    case 'bug':
      return '🐛'
    case 'initiative':
      return '💡'
    case 'feedback':
      return '💬'
    default:
      return '📝'
  }
}

export const isReportResolved = (report: Report): boolean => {
  return report.status === 'archived'
}

export const canEditReport = (report: Report, userId: string | null): boolean => {
  // Widget submissions (no created_by) can't be edited
  // Dashboard reports can be edited by creator or project members
  return report.created_by !== null
}

export const getReportAge = (report: Report): { days: number; hours: number } => {
  const now = new Date()
  const diff = now.getTime() - report.created_at.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return { days, hours }
}

// Database field mappings
export const mapReportToDatabase = (report: Partial<Report>) => {
  return {
    id: report.id,
    project_id: report.project_id,
    type: report.type,
    title: report.title,
    description: report.description,
    status: report.status,
    priority: report.priority,
    user_info: report.user_info ? JSON.stringify(report.user_info) : null,
    diagnostic_data: report.diagnostic_data ? JSON.stringify(report.diagnostic_data) : null,
    internal_notes: report.internal_notes,
    resolution_notes: report.resolution_notes,
    assigned_to: report.assigned_to,
    created_by: report.created_by,
    created_at: report.created_at,
    updated_at: report.updated_at,
    resolved_at: report.resolved_at
  }
}

export const mapDatabaseToReport = (dbReport: any): Report => {
  return ReportSchema.parse({
    id: dbReport.id,
    project_id: dbReport.project_id,
    type: dbReport.type,
    title: dbReport.title,
    description: dbReport.description,
    status: dbReport.status,
    priority: dbReport.priority,
    user_info: dbReport.user_info ? JSON.parse(dbReport.user_info) : null,
    diagnostic_data: dbReport.diagnostic_data ? JSON.parse(dbReport.diagnostic_data) : null,
    internal_notes: dbReport.internal_notes,
    resolution_notes: dbReport.resolution_notes,
    assigned_to: dbReport.assigned_to,
    created_by: dbReport.created_by,
    created_at: new Date(dbReport.created_at),
    updated_at: new Date(dbReport.updated_at),
    resolved_at: dbReport.resolved_at ? new Date(dbReport.resolved_at) : null
  })
}