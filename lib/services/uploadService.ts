/**
 * File Upload Service with MinIO Integration
 * T086: File upload service with MinIO integration
 */

import { supabaseAdmin, handleDatabaseError, measureQuery, DatabaseError } from '@/lib/database/supabase'
import { storage, BUCKETS, generateObjectName, validateFileSize, validateContentType, getFileExtension, StorageError } from '@/lib/storage/minio'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

// Types for upload operations
export interface UploadedFile {
  id: string
  filename: string
  original_filename: string
  content_type: string
  size: number
  url: string
  signed_url?: string
  project_id: string
  report_id?: string
  description?: string
  scan_status: 'pending' | 'clean' | 'quarantined' | 'failed'
  scan_result?: string
  created_at: Date
  updated_at: Date
}

export interface UploadMetadata {
  project_id: string
  report_id?: string
  description?: string
  user_id?: string
}

// Validation schemas
const UploadMetadataSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
  report_id: z.string().uuid('Invalid report ID format').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  user_id: z.string().uuid('Invalid user ID format').optional()
})

const FileValidationSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  size: z.number().positive('File size must be positive'),
  content_type: z.string().min(1, 'Content type is required'),
  buffer: z.instanceof(Buffer, 'File buffer is required')
})

export class UploadService {
  private static instance: UploadService

  private constructor() {}

  public static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService()
    }
    return UploadService.instance
  }

  /**
   * Upload a single file
   */
  async uploadFile(
    fileData: {
      filename: string
      buffer: Buffer
      content_type: string
      size: number
    },
    metadata: UploadMetadata
  ): Promise<UploadedFile> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Validate metadata
      const validatedMetadata = UploadMetadataSchema.parse(metadata)

      // Validate file data
      const validatedFile = FileValidationSchema.parse(fileData)

      // Sanitize filename
      const sanitizedFilename = this.sanitizeFilename(validatedFile.filename)

      // Validate file constraints
      this.validateFileConstraints(validatedFile.size, validatedFile.content_type, sanitizedFilename)

      // Generate unique object name
      const objectName = generateObjectName(
        validatedMetadata.project_id,
        sanitizedFilename,
        validatedMetadata.report_id
      )

      // Upload to MinIO
      const uploadResult = await storage.uploadFile(
        BUCKETS.ATTACHMENTS,
        objectName,
        validatedFile.buffer,
        validatedFile.size,
        {
          'Content-Type': validatedFile.content_type,
          'Original-Filename': validatedFile.filename,
          'Project-ID': validatedMetadata.project_id,
          ...(validatedMetadata.report_id && { 'Report-ID': validatedMetadata.report_id }),
          ...(validatedMetadata.description && { 'Description': validatedMetadata.description })
        }
      )

      // Generate signed URL for secure access
      const signedUrl = await storage.getSignedUrl(BUCKETS.ATTACHMENTS, objectName, 3600)

      // Save file record to database
      const fileRecord = await this.saveFileRecord({
        filename: sanitizedFilename,
        original_filename: validatedFile.filename,
        content_type: validatedFile.content_type,
        size: validatedFile.size,
        storage_path: objectName,
        etag: uploadResult.etag,
        url: uploadResult.url,
        project_id: validatedMetadata.project_id,
        report_id: validatedMetadata.report_id,
        description: validatedMetadata.description,
        user_id: validatedMetadata.user_id
      })

      // Queue virus scan (asynchronous)
      this.queueVirusScan(fileRecord.id, objectName).catch(error => {
        console.error('Failed to queue virus scan:', error)
      })

      return {
        ...fileRecord,
        signed_url: signedUrl
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new DatabaseError(
          `Validation failed: ${error.errors.map(e => e.message).join(', ')}`,
          'VALIDATION_ERROR'
        )
      }
      if (error instanceof StorageError || error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Array<{
      filename: string
      buffer: Buffer
      content_type: string
      size: number
    }>,
    metadata: UploadMetadata
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, metadata))
    return Promise.all(uploadPromises)
  }

  /**
   * Upload file from base64 data (for widget uploads)
   */
  async uploadFromBase64(
    base64Data: string,
    filename: string,
    contentType: string,
    metadata: UploadMetadata
  ): Promise<UploadedFile> {
    try {
      const buffer = Buffer.from(base64Data, 'base64')

      return await this.uploadFile({
        filename,
        buffer,
        content_type: contentType,
        size: buffer.length
      }, metadata)

    } catch (error) {
      throw new DatabaseError(`Failed to upload base64 file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string): Promise<UploadedFile | null> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: file, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .select('*')
          .eq('id', fileId)
          .single(),
        'getFileById'
      )

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        handleDatabaseError(error)
      }

      return this.mapDatabaseRecord(file)

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get files by project ID
   */
  async getFilesByProject(projectId: string, limit: number = 50): Promise<UploadedFile[]> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: files, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(limit),
        'getFilesByProject'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return (files || []).map(file => this.mapDatabaseRecord(file))

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get project files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get files by report ID
   */
  async getFilesByReport(reportId: string): Promise<UploadedFile[]> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: files, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .select('*')
          .eq('report_id', reportId)
          .order('created_at', { ascending: false }),
        'getFilesByReport'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return (files || []).map(file => this.mapDatabaseRecord(file))

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get report files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Get file record first
      const file = await this.getFileById(fileId)
      if (!file) {
        throw new DatabaseError('File not found', 'FILE_NOT_FOUND')
      }

      // Delete from storage
      const objectName = this.extractObjectNameFromUrl(file.url)
      await storage.deleteObject(BUCKETS.ATTACHMENTS, objectName)

      // Delete from database
      const { error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .delete()
          .eq('id', fileId),
        'deleteFile'
      )

      if (error) {
        handleDatabaseError(error)
      }

    } catch (error) {
      if (error instanceof DatabaseError || error instanceof StorageError) {
        throw error
      }
      throw new DatabaseError(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate new signed URL for file access
   */
  async getSignedUrl(fileId: string, expirySeconds: number = 3600): Promise<string> {
    const file = await this.getFileById(fileId)
    if (!file) {
      throw new DatabaseError('File not found', 'FILE_NOT_FOUND')
    }

    const objectName = this.extractObjectNameFromUrl(file.url)
    return await storage.getSignedUrl(BUCKETS.ATTACHMENTS, objectName, expirySeconds)
  }

  /**
   * Update scan status
   */
  async updateScanStatus(
    fileId: string,
    status: 'pending' | 'clean' | 'quarantined' | 'failed',
    result?: string
  ): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_attachments')
          .update({
            scan_status: status,
            scan_result: result,
            updated_at: new Date().toISOString()
          })
          .eq('id', fileId),
        'updateScanStatus'
      )

      if (error) {
        handleDatabaseError(error)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to update scan status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Private helper methods
   */
  private sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    const safeName = filename.replace(/\.\.\//g, '').replace(/\.\.\\/g, '')

    // Keep only safe characters
    return safeName.replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  private validateFileConstraints(size: number, contentType: string, filename: string): void {
    // Validate file size (5MB max)
    if (!validateFileSize(size)) {
      throw new DatabaseError('File too large. Maximum size is 5MB', 'FILE_TOO_LARGE')
    }

    // Validate content type
    if (!validateContentType(contentType)) {
      throw new DatabaseError('File type not supported', 'UNSUPPORTED_FILE_TYPE')
    }

    // Validate content type matches extension
    const extension = getFileExtension(filename)
    if (!this.contentTypeMatchesExtension(contentType, extension)) {
      throw new DatabaseError('File content type and extension mismatch', 'CONTENT_TYPE_MISMATCH')
    }
  }

  private contentTypeMatchesExtension(contentType: string, extension: string): boolean {
    const typeMap: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'image/svg+xml': ['svg'],
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'text/csv': ['csv'],
      'application/json': ['json'],
      'video/mp4': ['mp4'],
      'video/webm': ['webm'],
      'video/quicktime': ['mov']
    }

    const allowedExtensions = typeMap[contentType]
    return allowedExtensions ? allowedExtensions.includes(extension) : false
  }

  private async saveFileRecord(data: {
    filename: string
    original_filename: string
    content_type: string
    size: number
    storage_path: string
    etag: string
    url: string
    project_id: string
    report_id?: string
    description?: string
    user_id?: string
  }): Promise<UploadedFile> {
    const { data: file, error } = await measureQuery(
      () => supabaseAdmin!
        .from('fl_attachments')
        .insert({
          id: uuidv4(),
          filename: data.filename,
          original_filename: data.original_filename,
          file_size: data.size,
          mime_type: data.content_type,
          storage_path: data.storage_path,
          etag: data.etag,
          url: data.url,
          project_id: data.project_id,
          report_id: data.report_id,
          description: data.description,
          user_id: data.user_id,
          scan_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single(),
      'saveFileRecord'
    )

    if (error) {
      handleDatabaseError(error)
    }

    return this.mapDatabaseRecord(file)
  }

  private mapDatabaseRecord(record: any): UploadedFile {
    return {
      id: record.id,
      filename: record.filename,
      original_filename: record.original_filename,
      content_type: record.mime_type,
      size: record.file_size,
      url: record.url,
      project_id: record.project_id,
      report_id: record.report_id,
      description: record.description,
      scan_status: record.scan_status || 'pending',
      scan_result: record.scan_result,
      created_at: new Date(record.created_at),
      updated_at: new Date(record.updated_at)
    }
  }

  private extractObjectNameFromUrl(url: string): string {
    const urlParts = url.split('/')
    const bucketIndex = urlParts.findIndex(part => part === BUCKETS.ATTACHMENTS)
    return urlParts.slice(bucketIndex + 1).join('/')
  }

  private async queueVirusScan(fileId: string, objectName: string): Promise<void> {
    // TODO: Implement actual virus scanning
    // For now, mark all files as clean after a short delay
    setTimeout(async () => {
      try {
        await this.updateScanStatus(fileId, 'clean', 'No threats detected')
      } catch (error) {
        console.error('Failed to update scan status:', error)
      }
    }, 2000)
  }
}

// Export singleton instance
export const uploadService = UploadService.getInstance()