/**
 * File Upload Service with MinIO Integration
 * T086: File upload service with MinIO integration in lib/services/fileService.ts
 */

import { v4 as uuidv4 } from 'uuid'
import { supabaseAdmin, handleDatabaseError, measureQuery, DatabaseError } from '@/lib/database/supabase'
import {
  storage,
  BUCKETS,
  generateObjectName,
  generateThumbnailName,
  validateContentType,
  validateFileSize,
  StorageError
} from '@/lib/storage/minio'
import {
  FileUpload,
  WidgetAttachment,
  UpdateAttachment,
  Attachment,
  AttachmentListItem,
  AttachmentAnalytics,
  AttachmentStatus,
  ScanStatus,
  validateFileUpload,
  validateWidgetAttachment,
  validateUpdateAttachment,
  mapDatabaseToAttachment,
  formatFileSize,
  getFileExtension,
  isImageFile,
  isVideoFile,
  isDocumentFile,
  sanitizeFilename,
  shouldGenerateThumbnail,
  canDownloadAttachment
} from '@/lib/models/attachment'

export interface FileUploadResult {
  attachment: Attachment
  url: string
  thumbnail_url?: string
}

export interface UploadProgress {
  attachment_id: string
  status: AttachmentStatus
  progress: number
  error?: string
}

export interface FileServiceConfig {
  maxFileSize: number
  allowedTypes: string[]
  enableVirusScanning: boolean
  enableThumbnails: boolean
  maxFilesPerReport: number
}

export class FileService {
  private static instance: FileService
  private config: FileServiceConfig

  private constructor() {
    this.config = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'text/csv', 'application/json',
        'video/mp4', 'video/webm', 'video/quicktime'
      ],
      enableVirusScanning: false, // Would integrate with external service
      enableThumbnails: true,
      maxFilesPerReport: 5
    }
  }

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService()
    }
    return FileService.instance
  }

  /**
   * Upload file from form data (dashboard uploads)
   */
  async uploadFile(
    fileData: FileUpload,
    fileBuffer: Buffer,
    uploadedBy?: string
  ): Promise<FileUploadResult> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Validate file data
      const validatedData = validateFileUpload(fileData)

      // Validate file constraints
      await this.validateFileConstraints(validatedData, fileBuffer)

      // Generate storage path
      const storagePath = generateObjectName(
        validatedData.project_id,
        validatedData.filename,
        validatedData.report_id || undefined
      )

      // Upload to MinIO
      const { url: storageUrl } = await storage.uploadFile(
        BUCKETS.ATTACHMENTS,
        storagePath,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': validatedData.content_type,
          'Content-Disposition': `attachment; filename="${validatedData.filename}"`,
          'X-Project-ID': validatedData.project_id,
          'X-Report-ID': validatedData.report_id || '',
          'X-Uploaded-By': uploadedBy || 'system'
        }
      )

      // Generate attachment ID
      const attachmentId = uuidv4()

      // Create attachment record in database
      const { data: attachment, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .insert({
            id: attachmentId,
            project_id: validatedData.project_id,
            report_id: validatedData.report_id,
            filename: sanitizeFilename(validatedData.filename),
            original_filename: validatedData.filename,
            content_type: validatedData.content_type,
            size: validatedData.size,
            url: storageUrl,
            storage_path: storagePath,
            status: 'processing',
            description: validatedData.description,
            scan_status: this.config.enableVirusScanning ? 'pending' : 'clean',
            uploaded_by: uploadedBy || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single(),
        'createAttachment'
      )

      if (error) {
        // Clean up uploaded file if database insert fails
        try {
          await storage.deleteObject(BUCKETS.ATTACHMENTS, storagePath)
        } catch (cleanupError) {
          console.error('Failed to cleanup file after database error:', cleanupError)
        }
        handleDatabaseError(error)
      }

      const mappedAttachment = mapDatabaseToAttachment(attachment)

      // Process attachment asynchronously
      this.processAttachmentAsync(attachmentId, storagePath, validatedData.content_type)

      const result: FileUploadResult = {
        attachment: mappedAttachment,
        url: storageUrl
      }

      // Generate thumbnail for images
      if (this.config.enableThumbnails && shouldGenerateThumbnail(validatedData.content_type)) {
        try {
          const thumbnailUrl = await this.generateThumbnail(storagePath, fileBuffer)
          result.thumbnail_url = thumbnailUrl
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error)
        }
      }

      return result

    } catch (error) {
      if (error instanceof DatabaseError || error instanceof StorageError) {
        throw error
      }
      throw new DatabaseError(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload file from widget (base64 data)
   */
  async uploadWidgetAttachment(
    projectKey: string,
    reportId: string,
    attachmentData: WidgetAttachment
  ): Promise<FileUploadResult> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Validate attachment data
      const validatedData = validateWidgetAttachment(attachmentData)

      // Get project ID from integration key
      const { data: project, error: projectError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_projects')
          .select('id')
          .eq('integration_key', projectKey)
          .single(),
        'getProjectByKey'
      )

      if (projectError || !project) {
        throw new DatabaseError('Invalid project key', 'INVALID_PROJECT_KEY')
      }

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(validatedData.base64_data, 'base64')

      // Validate actual file size matches declared size
      if (fileBuffer.length !== validatedData.size) {
        throw new DatabaseError('File size mismatch', 'SIZE_MISMATCH')
      }

      // Validate file constraints
      await this.validateFileConstraints({
        filename: validatedData.filename,
        content_type: validatedData.content_type,
        size: validatedData.size,
        project_id: project.id,
        report_id: reportId
      }, fileBuffer)

      // Generate storage path
      const storagePath = generateObjectName(
        project.id,
        validatedData.filename,
        reportId
      )

      // Upload to MinIO
      const { url: storageUrl } = await storage.uploadFile(
        BUCKETS.ATTACHMENTS,
        storagePath,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': validatedData.content_type,
          'Content-Disposition': `attachment; filename="${validatedData.filename}"`,
          'X-Project-ID': project.id,
          'X-Report-ID': reportId,
          'X-Source': 'widget'
        }
      )

      // Generate attachment ID
      const attachmentId = uuidv4()

      // Create attachment record in database
      const { data: attachment, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .insert({
            id: attachmentId,
            project_id: project.id,
            report_id: reportId,
            filename: sanitizeFilename(validatedData.filename),
            original_filename: validatedData.filename,
            content_type: validatedData.content_type,
            size: validatedData.size,
            url: storageUrl,
            storage_path: storagePath,
            status: 'processing',
            scan_status: this.config.enableVirusScanning ? 'pending' : 'clean',
            uploaded_by: null, // Widget uploads are anonymous
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single(),
        'createWidgetAttachment'
      )

      if (error) {
        // Clean up uploaded file if database insert fails
        try {
          await storage.deleteObject(BUCKETS.ATTACHMENTS, storagePath)
        } catch (cleanupError) {
          console.error('Failed to cleanup file after database error:', cleanupError)
        }
        handleDatabaseError(error)
      }

      const mappedAttachment = mapDatabaseToAttachment(attachment)

      // Process attachment asynchronously
      this.processAttachmentAsync(attachmentId, storagePath, validatedData.content_type)

      const result: FileUploadResult = {
        attachment: mappedAttachment,
        url: storageUrl
      }

      // Generate thumbnail for images
      if (this.config.enableThumbnails && shouldGenerateThumbnail(validatedData.content_type)) {
        try {
          const thumbnailUrl = await this.generateThumbnail(storagePath, fileBuffer)
          result.thumbnail_url = thumbnailUrl
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error)
        }
      }

      return result

    } catch (error) {
      if (error instanceof DatabaseError || error instanceof StorageError) {
        throw error
      }
      throw new DatabaseError(`Failed to upload widget attachment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get attachment by ID
   */
  async getAttachment(attachmentId: string): Promise<Attachment | null> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: attachment, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .select('*')
          .eq('id', attachmentId)
          .single(),
        'getAttachment'
      )

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Attachment not found
        }
        handleDatabaseError(error)
      }

      return mapDatabaseToAttachment(attachment)

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get attachment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get attachments for a report
   */
  async getReportAttachments(reportId: string): Promise<AttachmentListItem[]> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: attachments, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .select('*')
          .eq('report_id', reportId)
          .order('created_at', { ascending: false }),
        'getReportAttachments'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return (attachments || []).map(attachment => this.mapToAttachmentListItem(attachment))

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get report attachments: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get attachments for a project
   */
  async getProjectAttachments(projectId: string, limit = 50, offset = 0): Promise<AttachmentListItem[]> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: attachments, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),
        'getProjectAttachments'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return (attachments || []).map(attachment => this.mapToAttachmentListItem(attachment))

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get project attachments: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update attachment
   */
  async updateAttachment(attachmentId: string, updateData: UpdateAttachment): Promise<Attachment> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Check if attachment exists
      const existingAttachment = await this.getAttachment(attachmentId)
      if (!existingAttachment) {
        throw new DatabaseError('Attachment not found', 'ATTACHMENT_NOT_FOUND')
      }

      // Validate update data
      const validatedData = validateUpdateAttachment(updateData)

      const updatePayload: any = {
        updated_at: new Date().toISOString()
      }

      if (validatedData.filename !== undefined) {
        updatePayload.filename = sanitizeFilename(validatedData.filename)
      }

      if (validatedData.description !== undefined) {
        updatePayload.description = validatedData.description
      }

      if (validatedData.status !== undefined) {
        updatePayload.status = validatedData.status
      }

      if (validatedData.scan_status !== undefined) {
        updatePayload.scan_status = validatedData.scan_status
      }

      if (validatedData.scan_result !== undefined) {
        updatePayload.scan_result = validatedData.scan_result
        updatePayload.scanned_at = new Date().toISOString()
      }

      const { data: attachment, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .update(updatePayload)
          .eq('id', attachmentId)
          .select()
          .single(),
        'updateAttachment'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return mapDatabaseToAttachment(attachment)

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to update attachment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Get attachment to find storage path
      const attachment = await this.getAttachment(attachmentId)
      if (!attachment) {
        throw new DatabaseError('Attachment not found', 'ATTACHMENT_NOT_FOUND')
      }

      // Delete from database first
      const { error: deleteError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .delete()
          .eq('id', attachmentId),
        'deleteAttachment'
      )

      if (deleteError) {
        handleDatabaseError(deleteError)
      }

      // Delete from storage
      try {
        await storage.deleteObject(BUCKETS.ATTACHMENTS, attachment.storage_path)
      } catch (storageError) {
        console.error('Failed to delete file from storage:', storageError)
        // Don't throw here - database cleanup succeeded
      }

      // Delete thumbnail if exists
      try {
        if (shouldGenerateThumbnail(attachment.content_type)) {
          const thumbnailPath = generateThumbnailName(attachment.storage_path)
          await storage.deleteObject(BUCKETS.THUMBNAILS, thumbnailPath)
        }
      } catch (thumbnailError) {
        console.error('Failed to delete thumbnail:', thumbnailError)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to delete attachment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get signed download URL for attachment
   */
  async getDownloadUrl(attachmentId: string, expirySeconds = 3600): Promise<string> {
    try {
      const attachment = await this.getAttachment(attachmentId)
      if (!attachment) {
        throw new DatabaseError('Attachment not found', 'ATTACHMENT_NOT_FOUND')
      }

      if (!canDownloadAttachment(attachment)) {
        throw new DatabaseError('Attachment is not available for download', 'ATTACHMENT_NOT_READY')
      }

      // Update download count
      await this.incrementDownloadCount(attachmentId)

      // Generate signed URL
      return await storage.getSignedUrl(BUCKETS.ATTACHMENTS, attachment.storage_path, expirySeconds)

    } catch (error) {
      if (error instanceof DatabaseError || error instanceof StorageError) {
        throw error
      }
      throw new DatabaseError(`Failed to get download URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get attachment analytics for a project
   */
  async getProjectAttachmentAnalytics(projectId: string): Promise<AttachmentAnalytics> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Get basic stats
      const { data: attachments, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .select('content_type, size, status, created_at')
          .eq('project_id', projectId),
        'getAttachmentAnalytics'
      )

      if (error) {
        handleDatabaseError(error)
      }

      if (!attachments) {
        return this.emptyAnalytics()
      }

      const total_count = attachments.length
      const total_size = attachments.reduce((sum, att) => sum + (att.size || 0), 0)

      // Group by type
      const by_type: Record<string, number> = {}
      const by_status: Record<string, number> = {}

      attachments.forEach(att => {
        const type = att.content_type?.split('/')[0] || 'unknown'
        by_type[type] = (by_type[type] || 0) + 1

        const status = att.status || 'unknown'
        by_status[status] = (by_status[status] || 0) + 1
      })

      // Upload trends (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const upload_trends = []
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]

        const dayAttachments = attachments.filter(att =>
          att.created_at?.startsWith(dateStr)
        )

        upload_trends.push({
          date: dateStr,
          count: dayAttachments.length,
          size: dayAttachments.reduce((sum, att) => sum + (att.size || 0), 0)
        })
      }

      return {
        total_count,
        total_size,
        by_type,
        by_status,
        upload_trends
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get attachment analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Private helper methods
   */

  private async validateFileConstraints(fileData: Partial<FileUpload>, fileBuffer: Buffer): Promise<void> {
    // Validate file size
    if (!validateFileSize(fileData.size || 0, this.config.maxFileSize)) {
      throw new DatabaseError(`File size exceeds maximum allowed size of ${formatFileSize(this.config.maxFileSize)}`, 'FILE_TOO_LARGE')
    }

    // Validate content type
    if (!validateContentType(fileData.content_type || '')) {
      throw new DatabaseError('File type not allowed', 'INVALID_FILE_TYPE')
    }

    // Validate buffer size matches declared size
    if (fileBuffer.length !== fileData.size) {
      throw new DatabaseError('File size mismatch', 'SIZE_MISMATCH')
    }

    // Check file limits for report
    if (fileData.report_id) {
      const existingAttachments = await this.getReportAttachments(fileData.report_id)
      if (existingAttachments.length >= this.config.maxFilesPerReport) {
        throw new DatabaseError(`Maximum ${this.config.maxFilesPerReport} files allowed per report`, 'TOO_MANY_FILES')
      }
    }
  }

  private async processAttachmentAsync(attachmentId: string, storagePath: string, contentType: string): Promise<void> {
    try {
      // This would run in background
      // For now, just mark as ready
      await this.updateAttachment(attachmentId, { status: 'ready' })

      // Virus scanning would happen here if enabled
      if (this.config.enableVirusScanning) {
        // Implement virus scanning integration
      }

    } catch (error) {
      console.error('Failed to process attachment:', error)
      await this.updateAttachment(attachmentId, {
        status: 'error',
        scan_result: 'Processing failed'
      })
    }
  }

  private async generateThumbnail(storagePath: string, fileBuffer: Buffer): Promise<string> {
    // This would implement actual thumbnail generation
    // For now, return a placeholder
    const thumbnailPath = generateThumbnailName(storagePath)

    try {
      // In real implementation, would use image processing library
      // For now, just return the original URL
      const thumbnailUrl = await storage.getObjectUrl(BUCKETS.THUMBNAILS, thumbnailPath)
      return thumbnailUrl
    } catch (error) {
      throw new StorageError('Failed to generate thumbnail', 'THUMBNAIL_ERROR')
    }
  }

  private async incrementDownloadCount(attachmentId: string): Promise<void> {
    if (!supabaseAdmin) return

    try {
      await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .update({
            download_count: supabaseAdmin.rpc('increment_download_count', { attachment_id: attachmentId }),
            last_downloaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', attachmentId),
        'incrementDownloadCount'
      )
    } catch (error) {
      console.error('Failed to increment download count:', error)
    }
  }

  private mapToAttachmentListItem(dbAttachment: any): AttachmentListItem {
    const contentType = dbAttachment.content_type || ''

    return {
      id: dbAttachment.id,
      filename: dbAttachment.filename,
      original_filename: dbAttachment.original_filename,
      content_type: contentType,
      size: dbAttachment.size,
      url: dbAttachment.url,
      status: dbAttachment.status,
      description: dbAttachment.description,
      created_at: new Date(dbAttachment.created_at),
      is_image: isImageFile(contentType),
      is_video: isVideoFile(contentType),
      is_document: isDocumentFile(contentType),
      file_extension: getFileExtension(dbAttachment.filename),
      formatted_size: formatFileSize(dbAttachment.size)
    }
  }

  private emptyAnalytics(): AttachmentAnalytics {
    return {
      total_count: 0,
      total_size: 0,
      by_type: {},
      by_status: {},
      upload_trends: []
    }
  }

  /**
   * Health check for file service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check storage connection
      const storageHealthy = await storage.healthCheck()

      // Check database connection by counting attachments
      if (!supabaseAdmin) return false

      const { error } = await supabaseAdmin
        .from('fl_attachments')
        .select('id', { count: 'exact', head: true })
        .limit(1)

      return storageHealthy && !error

    } catch (error) {
      console.error('File service health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const fileService = FileService.getInstance()

// Export class for testing
export { FileService }

// Helper functions for common use cases
export const uploadFile = (fileData: FileUpload, fileBuffer: Buffer, uploadedBy?: string) =>
  fileService.uploadFile(fileData, fileBuffer, uploadedBy)

export const uploadWidgetAttachment = (projectKey: string, reportId: string, attachmentData: WidgetAttachment) =>
  fileService.uploadWidgetAttachment(projectKey, reportId, attachmentData)

export const getAttachment = (attachmentId: string) => fileService.getAttachment(attachmentId)

export const getReportAttachments = (reportId: string) => fileService.getReportAttachments(reportId)

export const getProjectAttachments = (projectId: string, limit?: number, offset?: number) =>
  fileService.getProjectAttachments(projectId, limit, offset)

export const updateAttachment = (attachmentId: string, updateData: UpdateAttachment) =>
  fileService.updateAttachment(attachmentId, updateData)

export const deleteAttachment = (attachmentId: string) => fileService.deleteAttachment(attachmentId)

export const getDownloadUrl = (attachmentId: string, expirySeconds?: number) =>
  fileService.getDownloadUrl(attachmentId, expirySeconds)

export const getProjectAttachmentAnalytics = (projectId: string) =>
  fileService.getProjectAttachmentAnalytics(projectId)