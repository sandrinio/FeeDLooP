/**
 * Zod validation schemas for Project Settings feature
 * Based on data-model.md validation rules
 */

import { z } from 'zod'

// Core entity schemas
export const ProjectInfoSchema = z.object({
  id: z.string().uuid('Invalid project ID format'),
  name: z.string().min(1, 'Project name is required').max(100, 'Project name must be less than 100 characters'),
  owner_id: z.string().uuid('Invalid owner ID format'),
  created_at: z.string().datetime('Invalid date format'),
  integration_key: z.string().length(32, 'Integration key must be 32 characters')
})

export const ProjectStatisticsSchema = z.object({
  member_count: z.number().int().min(0, 'Member count cannot be negative'),
  report_count: z.number().int().min(0, 'Report count cannot be negative'),
  attachment_count: z.number().int().min(0, 'Attachment count cannot be negative'),
  export_template_count: z.number().int().min(0, 'Export template count cannot be negative'),
  total_storage_usage: z.number().int().min(0, 'Storage usage cannot be negative')
})

export const ProjectPermissionsSchema = z.object({
  can_delete: z.boolean(),
  can_modify: z.boolean()
})

export const ProjectSettingsDataSchema = z.object({
  project: ProjectInfoSchema,
  statistics: ProjectStatisticsSchema,
  permissions: ProjectPermissionsSchema
})

// Deletion request validation
export const ProjectDeletionRequestSchema = z.object({
  confirmation_text: z.string()
    .min(1, 'Confirmation text is required')
    .max(100, 'Confirmation text must be less than 100 characters'),
  understood_consequences: z.boolean()
    .refine(val => val === true, {
      message: 'You must acknowledge the consequences of deletion'
    }),
  deletion_reason: z.string()
    .max(500, 'Deletion reason must be less than 500 characters')
    .optional()
})

// Response schemas
export const CleanupSummarySchema = z.object({
  database_records_deleted: z.number().int().min(0),
  storage_files_deleted: z.number().int().min(0),
  storage_cleanup_failures: z.array(z.string())
})

export const ErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  recoverable: z.boolean()
})

export const ProjectDeletionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  cleanup_summary: CleanupSummarySchema.optional(),
  error_details: ErrorDetailsSchema.optional()
})

// Form validation helpers
export const validateProjectName = (inputName: string, actualName: string): boolean => {
  return inputName.trim() === actualName.trim()
}

export const validateDeletionForm = (data: {
  confirmation_text: string
  understood_consequences: boolean
  deletion_reason?: string
}, projectName: string) => {
  const errors: Record<string, string> = {}

  // Validate confirmation text matches project name exactly
  if (!data.confirmation_text) {
    errors.confirmation_text = 'Please enter the project name to confirm deletion'
  } else if (!validateProjectName(data.confirmation_text, projectName)) {
    errors.confirmation_text = `Please enter "${projectName}" exactly as shown`
  }

  // Validate consequences acknowledgment
  if (!data.understood_consequences) {
    errors.understood_consequences = 'You must acknowledge that you understand the consequences'
  }

  // Validate optional deletion reason
  if (data.deletion_reason && data.deletion_reason.length > 500) {
    errors.deletion_reason = 'Deletion reason must be less than 500 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Server-side validation helper
export const validateProjectOwnership = (userId: string, projectOwnerId: string): boolean => {
  return userId === projectOwnerId
}

// API parameter validation
export const ProjectIdParamSchema = z.object({
  id: z.string().uuid('Invalid project ID format')
})

export const ProjectSettingsQuerySchema = z.object({
  include_statistics: z.boolean().optional().default(true),
  include_permissions: z.boolean().optional().default(true)
})

// Type exports for use with the schemas
export type ProjectInfoType = z.infer<typeof ProjectInfoSchema>
export type ProjectStatisticsType = z.infer<typeof ProjectStatisticsSchema>
export type ProjectPermissionsType = z.infer<typeof ProjectPermissionsSchema>
export type ProjectSettingsDataType = z.infer<typeof ProjectSettingsDataSchema>
export type ProjectDeletionRequestType = z.infer<typeof ProjectDeletionRequestSchema>
export type ProjectDeletionResponseType = z.infer<typeof ProjectDeletionResponseSchema>
export type CleanupSummaryType = z.infer<typeof CleanupSummarySchema>
export type ErrorDetailsType = z.infer<typeof ErrorDetailsSchema>