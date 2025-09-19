/**
 * Attachment Data Model with Zod Validation
 * T041: Attachment data model with Zod validation in lib/models/attachment.ts
 */

import { z } from 'zod'

// Attachment Status Enum
export const AttachmentStatusSchema = z.enum(['uploading', 'processing', 'ready', 'error', 'quarantined'])
export type AttachmentStatus = z.infer<typeof AttachmentStatusSchema>

// Scan Status Enum (for virus scanning)
export const ScanStatusSchema = z.enum(['pending', 'scanning', 'clean', 'infected', 'error'])
export type ScanStatus = z.infer<typeof ScanStatusSchema>

// Supported File Types
export const SupportedFileTypesSchema = z.enum([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'video/mp4',
  'video/webm',
  'video/quicktime'
])
export type SupportedFileType = z.infer<typeof SupportedFileTypesSchema>

// File Upload Schema (for direct uploads)
export const FileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters')
    .regex(/^[^<>:"/\\|?*\x00-\x1f]+\.[a-zA-Z0-9]+$/, 'Invalid filename format'),

  content_type: SupportedFileTypesSchema,

  size: z.number()
    .int()
    .positive()
    .max(5 * 1024 * 1024, 'File size must be less than 5MB'),

  project_id: z.string()
    .uuid('Invalid project ID format'),

  report_id: z.string()
    .uuid('Invalid report ID format')
    .optional()
    .nullable(),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable()
})

// Widget Attachment Schema (for widget submissions with base64 data)
export const WidgetAttachmentSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters')
    .regex(/^[^<>:"/\\|?*\x00-\x1f]+\.[a-zA-Z0-9]+$/, 'Invalid filename format'),

  content_type: SupportedFileTypesSchema,

  size: z.number()
    .int()
    .positive()
    .max(5 * 1024 * 1024, 'File size must be less than 5MB'),

  base64_data: z.string()
    .min(1, 'File data is required')
    .regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Invalid base64 data format')
})

// Attachment Update Schema
export const UpdateAttachmentSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters')
    .regex(/^[^<>:"/\\|?*\x00-\x1f]+\.[a-zA-Z0-9]+$/, 'Invalid filename format')
    .optional(),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),

  status: AttachmentStatusSchema
    .optional(),

  scan_status: ScanStatusSchema
    .optional(),

  scan_result: z.string()
    .max(1000, 'Scan result must be less than 1000 characters')
    .optional()
    .nullable()
})

// Full Attachment Schema (database representation)
export const AttachmentSchema = z.object({
  id: z.string()
    .uuid('Invalid attachment ID format'),

  project_id: z.string()
    .uuid('Invalid project ID format'),

  report_id: z.string()
    .uuid('Invalid report ID format')
    .nullable()
    .optional(),

  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters'),

  original_filename: z.string()
    .min(1, 'Original filename is required')
    .max(255, 'Original filename must be less than 255 characters'),

  content_type: SupportedFileTypesSchema,

  size: z.number()
    .int()
    .positive(),

  url: z.string()
    .url('Invalid URL format')
    .max(2000, 'URL must be less than 2000 characters'),

  storage_path: z.string()
    .min(1, 'Storage path is required')
    .max(500, 'Storage path must be less than 500 characters'),

  status: AttachmentStatusSchema
    .default('uploading'),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),

  metadata: z.object({
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    duration: z.number().positive().optional(), // for videos
    pages: z.number().int().positive().optional(), // for PDFs
    compression: z.string().optional(),
    color_space: z.string().optional()
  }).optional(),

  scan_status: ScanStatusSchema
    .default('pending'),

  scan_result: z.string()
    .max(1000, 'Scan result must be less than 1000 characters')
    .nullable()
    .optional(),

  scanned_at: z.date()
    .nullable()
    .optional(),

  download_count: z.number()
    .int()
    .nonnegative()
    .default(0),

  last_downloaded_at: z.date()
    .nullable()
    .optional(),

  uploaded_by: z.string()
    .uuid('Invalid user ID format')
    .nullable()
    .optional(), // Null for widget submissions

  created_at: z.date(),

  updated_at: z.date()
})

// Attachment List Item Schema (for attachment listings)
export const AttachmentListItemSchema = AttachmentSchema.pick({
  id: true,
  filename: true,
  original_filename: true,
  content_type: true,
  size: true,
  url: true,
  status: true,
  description: true,
  created_at: true
}).extend({
  is_image: z.boolean(),
  is_video: z.boolean(),
  is_document: z.boolean(),
  file_extension: z.string(),
  formatted_size: z.string()
})

// Attachment Analytics Schema
export const AttachmentAnalyticsSchema = z.object({
  total_count: z.number().int().nonnegative(),
  total_size: z.number().int().nonnegative(),
  by_type: z.record(z.string(), z.number().int().nonnegative()),
  by_status: z.record(z.string(), z.number().int().nonnegative()),
  upload_trends: z.array(z.object({
    date: z.string().date(),
    count: z.number().int().nonnegative(),
    size: z.number().int().nonnegative()
  }))
})

// Type exports
export type FileUpload = z.infer<typeof FileUploadSchema>
export type WidgetAttachment = z.infer<typeof WidgetAttachmentSchema>
export type UpdateAttachment = z.infer<typeof UpdateAttachmentSchema>
export type Attachment = z.infer<typeof AttachmentSchema>
export type AttachmentListItem = z.infer<typeof AttachmentListItemSchema>
export type AttachmentAnalytics = z.infer<typeof AttachmentAnalyticsSchema>

// Validation functions
export const validateFileUpload = (data: unknown) => FileUploadSchema.parse(data)
export const validateWidgetAttachment = (data: unknown) => WidgetAttachmentSchema.parse(data)
export const validateUpdateAttachment = (data: unknown) => UpdateAttachmentSchema.parse(data)
export const validateAttachment = (data: unknown) => AttachmentSchema.parse(data)
export const validateAttachmentListItem = (data: unknown) => AttachmentListItemSchema.parse(data)
export const validateAttachmentAnalytics = (data: unknown) => AttachmentAnalyticsSchema.parse(data)

// Safe validation functions
export const safeValidateFileUpload = (data: unknown) => FileUploadSchema.safeParse(data)
export const safeValidateWidgetAttachment = (data: unknown) => WidgetAttachmentSchema.safeParse(data)
export const safeValidateUpdateAttachment = (data: unknown) => UpdateAttachmentSchema.safeParse(data)
export const safeValidateAttachment = (data: unknown) => AttachmentSchema.safeParse(data)
export const safeValidateAttachmentListItem = (data: unknown) => AttachmentListItemSchema.safeParse(data)
export const safeValidateAttachmentAnalytics = (data: unknown) => AttachmentAnalyticsSchema.safeParse(data)

// Helper functions
export const generateAttachmentPath = (projectId: string, reportId: string | null, filename: string): string => {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)

  if (reportId) {
    return `projects/${projectId}/reports/${reportId}/${timestamp}_${randomSuffix}_${sanitizedFilename}`
  }

  return `projects/${projectId}/uploads/${timestamp}_${randomSuffix}_${sanitizedFilename}`
}

export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : ''
}

export const isImageFile = (contentType: string): boolean => {
  return contentType.startsWith('image/')
}

export const isVideoFile = (contentType: string): boolean => {
  return contentType.startsWith('video/')
}

export const isDocumentFile = (contentType: string): boolean => {
  return contentType === 'application/pdf' ||
         contentType === 'text/plain' ||
         contentType === 'text/csv' ||
         contentType === 'application/json'
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const validateFileType = (contentType: string): boolean => {
  return SupportedFileTypesSchema.safeParse(contentType).success
}

export const validateFileSize = (size: number): boolean => {
  return size > 0 && size <= 5 * 1024 * 1024 // 5MB limit
}

export const sanitizeFilename = (filename: string): string => {
  // Remove path traversal attempts and dangerous characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .substring(0, 255) // Truncate if too long
}

export const generateThumbnailPath = (attachmentPath: string): string => {
  const pathParts = attachmentPath.split('.')
  const extension = pathParts.pop()
  return `${pathParts.join('.')}_thumb.webp`
}

export const shouldGenerateThumbnail = (contentType: string): boolean => {
  return isImageFile(contentType) && contentType !== 'image/svg+xml'
}

export const getAttachmentStatusColor = (status: AttachmentStatus): string => {
  switch (status) {
    case 'uploading':
      return 'blue'
    case 'processing':
      return 'yellow'
    case 'ready':
      return 'green'
    case 'error':
      return 'red'
    case 'quarantined':
      return 'purple'
    default:
      return 'gray'
  }
}

export const getScanStatusColor = (scanStatus: ScanStatus): string => {
  switch (scanStatus) {
    case 'pending':
      return 'gray'
    case 'scanning':
      return 'blue'
    case 'clean':
      return 'green'
    case 'infected':
      return 'red'
    case 'error':
      return 'orange'
    default:
      return 'gray'
  }
}

export const canDownloadAttachment = (attachment: Attachment): boolean => {
  return attachment.status === 'ready' &&
         attachment.scan_status === 'clean'
}

export const getAttachmentMetadata = async (file: File | Buffer, contentType: string): Promise<object> => {
  // This would implement actual metadata extraction
  // For now, return basic metadata structure
  return Promise.resolve({
    content_type: contentType,
    extracted_at: new Date().toISOString()
  })
}

// Database field mappings
export const mapAttachmentToDatabase = (attachment: Partial<Attachment>) => {
  return {
    id: attachment.id,
    project_id: attachment.project_id,
    report_id: attachment.report_id,
    filename: attachment.filename,
    original_filename: attachment.original_filename,
    content_type: attachment.content_type,
    size: attachment.size,
    url: attachment.url,
    storage_path: attachment.storage_path,
    status: attachment.status,
    description: attachment.description,
    metadata: attachment.metadata ? JSON.stringify(attachment.metadata) : null,
    scan_status: attachment.scan_status,
    scan_result: attachment.scan_result,
    scanned_at: attachment.scanned_at,
    download_count: attachment.download_count,
    last_downloaded_at: attachment.last_downloaded_at,
    uploaded_by: attachment.uploaded_by,
    created_at: attachment.created_at,
    updated_at: attachment.updated_at
  }
}

export const mapDatabaseToAttachment = (dbAttachment: any): Attachment => {
  return AttachmentSchema.parse({
    id: dbAttachment.id,
    project_id: dbAttachment.project_id,
    report_id: dbAttachment.report_id,
    filename: dbAttachment.filename,
    original_filename: dbAttachment.original_filename,
    content_type: dbAttachment.content_type,
    size: dbAttachment.size,
    url: dbAttachment.url,
    storage_path: dbAttachment.storage_path,
    status: dbAttachment.status,
    description: dbAttachment.description,
    metadata: dbAttachment.metadata ? JSON.parse(dbAttachment.metadata) : {},
    scan_status: dbAttachment.scan_status,
    scan_result: dbAttachment.scan_result,
    scanned_at: dbAttachment.scanned_at ? new Date(dbAttachment.scanned_at) : null,
    download_count: dbAttachment.download_count || 0,
    last_downloaded_at: dbAttachment.last_downloaded_at ? new Date(dbAttachment.last_downloaded_at) : null,
    uploaded_by: dbAttachment.uploaded_by,
    created_at: new Date(dbAttachment.created_at),
    updated_at: new Date(dbAttachment.updated_at)
  })
}