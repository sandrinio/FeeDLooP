/**
 * TypeScript interfaces for Project Settings feature
 * Generated from data-model.md specifications
 */

export interface ProjectInfo {
  id: string
  name: string
  owner_id: string
  created_at: string
  integration_key: string
}

export interface ProjectStatistics {
  member_count: number
  report_count: number
  attachment_count: number
  export_template_count: number
  total_storage_usage: number // bytes
}

export interface ProjectPermissions {
  can_delete: boolean
  can_modify: boolean
}

export interface ProjectSettingsData {
  project: ProjectInfo
  statistics: ProjectStatistics
  permissions: ProjectPermissions
}

export interface ProjectDeletionRequest {
  confirmation_text: string
  understood_consequences: boolean
  deletion_reason?: string
}

export interface CleanupSummary {
  database_records_deleted: number
  storage_files_deleted: number
  storage_cleanup_failures: string[]
}

export interface ErrorDetails {
  code: string
  message: string
  recoverable: boolean
}

export interface ProjectDeletionResponse {
  success: boolean
  message: string
  cleanup_summary?: CleanupSummary
  error_details?: ErrorDetails
}

export interface DeletionOperation {
  project_id: string
  initiated_by: string
  initiated_at: string
  completed_at?: string
  status: 'in_progress' | 'completed' | 'failed' | 'partial'
  error_details?: any
}

// Form validation types
export interface DeletionConfirmation {
  confirmation_text: string
  understood_consequences: boolean
  deletion_reason?: string
}

// Hook return types
export interface UseProjectSettingsResult {
  data: ProjectSettingsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseDeletionFormResult {
  formData: DeletionConfirmation
  isValid: boolean
  errors: Record<string, string>
  updateField: (field: keyof DeletionConfirmation, value: any) => void
  reset: () => void
  validate: () => boolean
}