/**
 * Storage Cleanup Utilities
 * T012: Storage cleanup utilities for project deletion
 *
 * Handles cleanup of MinIO storage files when projects are deleted
 */

import { supabaseAdmin } from '@/lib/database/supabase'
import { storage, BUCKETS, type BucketName } from '@/lib/storage/minio'
import type { CleanupSummary } from '@/types/project-settings'

export interface StorageCleanupResult {
  success: boolean
  filesDeleted: number
  failures: string[]
  totalAttempted: number
}

export class StorageCleanupService {
  /**
   * Clean up all storage files associated with a project
   */
  static async cleanupProjectFiles(projectId: string): Promise<CleanupSummary> {
    const cleanup: CleanupSummary = {
      database_records_deleted: 0,
      storage_files_deleted: 0,
      storage_cleanup_failures: []
    }

    try {
      // Get all file attachments for this project from database
      const projectFiles = await this.getProjectFiles(projectId)

      if (projectFiles.length === 0) {
        // No files to clean up
        return cleanup
      }

      console.log(`Found ${projectFiles.length} files to clean up for project ${projectId}`)

      // Group files by bucket for efficient cleanup
      const filesByBucket = this.groupFilesByBucket(projectFiles)

      // Clean up files in each bucket
      for (const [bucketName, files] of Object.entries(filesByBucket)) {
        const result = await this.cleanupBucketFiles(bucketName as BucketName, files)

        cleanup.storage_files_deleted += result.filesDeleted
        cleanup.storage_cleanup_failures.push(...result.failures)

        console.log(`Bucket ${bucketName}: ${result.filesDeleted}/${result.totalAttempted} files deleted`)
      }

      // Clean up any project-specific directories/prefixes
      await this.cleanupProjectDirectories(projectId, cleanup)

      return cleanup
    } catch (error) {
      console.error('Error during storage cleanup:', error)

      // Add general cleanup failure
      cleanup.storage_cleanup_failures.push(
        `General cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      return cleanup
    }
  }

  /**
   * Get all file paths associated with a project
   */
  private static async getProjectFiles(projectId: string): Promise<Array<{
    id: string
    file_path: string
    file_name: string
    bucket_name?: string
  }>> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Database connection not available')
      }

      // Get attachment files
      const { data: attachments, error: attachmentError } = await supabaseAdmin
        .from('fl_attachments')
        .select('id, file_path, file_name')
        .eq('project_id', projectId)

      if (attachmentError) {
        console.error('Error fetching project attachments:', attachmentError)
        return []
      }

      // Map attachments to include bucket information
      const projectFiles = (attachments || []).map(attachment => ({
        id: attachment.id,
        file_path: attachment.file_path,
        file_name: attachment.file_name,
        bucket_name: BUCKETS.ATTACHMENTS // Most files are in attachments bucket
      }))

      // TODO: Add other file types if they exist (exports, thumbnails, etc.)
      // This could be extended to include other tables that store file references

      return projectFiles
    } catch (error) {
      console.error('Error getting project files:', error)
      return []
    }
  }

  /**
   * Group files by bucket for efficient batch operations
   */
  private static groupFilesByBucket(files: Array<{
    file_path: string
    bucket_name?: string
  }>): Record<string, string[]> {
    const grouped: Record<string, string[]> = {}

    files.forEach(file => {
      const bucket = file.bucket_name || BUCKETS.ATTACHMENTS

      if (!grouped[bucket]) {
        grouped[bucket] = []
      }

      // Use file_path as the object name for deletion
      grouped[bucket].push(file.file_path)
    })

    return grouped
  }

  /**
   * Clean up files in a specific bucket
   */
  private static async cleanupBucketFiles(
    bucketName: BucketName,
    filePaths: string[]
  ): Promise<StorageCleanupResult> {
    const result: StorageCleanupResult = {
      success: true,
      filesDeleted: 0,
      failures: [],
      totalAttempted: filePaths.length
    }

    if (filePaths.length === 0) {
      return result
    }

    try {
      // Try batch deletion first (more efficient)
      try {
        await storage.deleteObjects(bucketName, filePaths)
        result.filesDeleted = filePaths.length
        console.log(`Batch deleted ${filePaths.length} files from ${bucketName}`)
      } catch (batchError) {
        console.warn(`Batch deletion failed for ${bucketName}, trying individual deletion:`, batchError)

        // Fall back to individual deletion
        for (const filePath of filePaths) {
          try {
            await storage.deleteObject(bucketName, filePath)
            result.filesDeleted++
          } catch (individualError) {
            const errorMsg = `Failed to delete ${filePath}: ${individualError instanceof Error ? individualError.message : 'Unknown error'}`
            result.failures.push(errorMsg)
            console.error(errorMsg)
          }
        }
      }

      // Check if we had partial success
      if (result.failures.length > 0) {
        result.success = false
      }

    } catch (error) {
      result.success = false
      const errorMsg = `Bucket cleanup failed for ${bucketName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.failures.push(errorMsg)
      console.error(errorMsg)
    }

    return result
  }

  /**
   * Clean up project-specific directories and any remaining files
   */
  private static async cleanupProjectDirectories(
    projectId: string,
    cleanup: CleanupSummary
  ): Promise<void> {
    try {
      // Check for any remaining files in project directories
      const projectPrefix = `projects/${projectId}/`

      // Check each bucket for project-specific files
      for (const bucketName of Object.values(BUCKETS)) {
        try {
          const remainingFiles = await storage.listObjects(bucketName, projectPrefix, true)

          if (remainingFiles.length > 0) {
            console.log(`Found ${remainingFiles.length} additional files in ${bucketName} with prefix ${projectPrefix}`)

            const filePaths = remainingFiles.map(file => file.name)
            const result = await this.cleanupBucketFiles(bucketName, filePaths)

            cleanup.storage_files_deleted += result.filesDeleted
            cleanup.storage_cleanup_failures.push(...result.failures)
          }
        } catch (error) {
          const errorMsg = `Error cleaning project directory in ${bucketName}: ${error instanceof Error ? error.message : 'Unknown error'}`
          cleanup.storage_cleanup_failures.push(errorMsg)
          console.error(errorMsg)
        }
      }
    } catch (error) {
      const errorMsg = `Error during directory cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`
      cleanup.storage_cleanup_failures.push(errorMsg)
      console.error(errorMsg)
    }
  }

  /**
   * Test storage connectivity before attempting cleanup
   */
  static async testStorageConnection(): Promise<boolean> {
    try {
      return await storage.healthCheck()
    } catch (error) {
      console.error('Storage connection test failed:', error)
      return false
    }
  }

  /**
   * Get storage statistics for a project (before cleanup)
   */
  static async getProjectStorageStats(projectId: string): Promise<{
    fileCount: number
    totalSize: number
    bucketStats: Record<string, { count: number; size: number }>
  }> {
    const stats = {
      fileCount: 0,
      totalSize: 0,
      bucketStats: {} as Record<string, { count: number; size: number }>
    }

    try {
      const projectPrefix = `projects/${projectId}/`

      for (const bucketName of Object.values(BUCKETS)) {
        try {
          const files = await storage.listObjects(bucketName, projectPrefix, true)
          const bucketSize = files.reduce((sum, file) => sum + file.size, 0)

          stats.bucketStats[bucketName] = {
            count: files.length,
            size: bucketSize
          }

          stats.fileCount += files.length
          stats.totalSize += bucketSize
        } catch (error) {
          console.warn(`Could not get stats for bucket ${bucketName}:`, error)
          stats.bucketStats[bucketName] = { count: 0, size: 0 }
        }
      }
    } catch (error) {
      console.error('Error getting project storage stats:', error)
    }

    return stats
  }

  /**
   * Cleanup specific file by ID (for individual file deletion)
   */
  static async cleanupFileById(
    fileId: string,
    projectId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Database connection not available')
      }

      // Get file information
      const { data: file, error: fileError } = await supabaseAdmin
        .from('fl_attachments')
        .select('file_path, file_name')
        .eq('id', fileId)
        .eq('project_id', projectId)
        .single()

      if (fileError || !file) {
        return { success: false, error: 'File not found' }
      }

      // Delete from storage
      try {
        await storage.deleteObject(BUCKETS.ATTACHMENTS, file.file_path)
        return { success: true }
      } catch (storageError) {
        return {
          success: false,
          error: `Storage deletion failed: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Graceful cleanup with retries for critical operations
   */
  static async gracefulCleanup(
    projectId: string,
    maxRetries: number = 3
  ): Promise<CleanupSummary> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Storage cleanup attempt ${attempt}/${maxRetries} for project ${projectId}`)

        const result = await this.cleanupProjectFiles(projectId)

        // If we have some failures but overall success, that's acceptable
        if (result.storage_cleanup_failures.length === 0 ||
            result.storage_files_deleted > 0) {
          console.log(`Storage cleanup completed on attempt ${attempt}`)
          return result
        }

        // If we had failures, wait before retrying
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000) // Exponential backoff, max 5s
          console.log(`Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown cleanup error')
        console.error(`Storage cleanup attempt ${attempt} failed:`, error)

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // All attempts failed
    console.error(`All ${maxRetries} storage cleanup attempts failed for project ${projectId}`)

    return {
      database_records_deleted: 0,
      storage_files_deleted: 0,
      storage_cleanup_failures: [
        `Storage cleanup failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
      ]
    }
  }

  /**
   * Emergency cleanup mode - best effort deletion without throwing errors
   */
  static async emergencyCleanup(projectId: string): Promise<CleanupSummary> {
    console.warn(`Emergency storage cleanup initiated for project ${projectId}`)

    const cleanup: CleanupSummary = {
      database_records_deleted: 0,
      storage_files_deleted: 0,
      storage_cleanup_failures: []
    }

    try {
      // Try to get storage connection
      const connectionOk = await this.testStorageConnection()
      if (!connectionOk) {
        cleanup.storage_cleanup_failures.push('Storage service unavailable')
        return cleanup
      }

      // Attempt cleanup but don't fail if individual operations fail
      try {
        const result = await this.cleanupProjectFiles(projectId)
        return result
      } catch (error) {
        console.error('Emergency cleanup error:', error)
        cleanup.storage_cleanup_failures.push(
          `Emergency cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }

    } catch (error) {
      console.error('Critical emergency cleanup error:', error)
      cleanup.storage_cleanup_failures.push('Critical cleanup failure')
    }

    return cleanup
  }
}