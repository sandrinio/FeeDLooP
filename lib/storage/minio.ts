/**
 * MinIO Client Setup and Bucket Configuration
 * T043: MinIO client setup and bucket configuration in lib/storage/minio.ts
 */

import { Client as MinIOClient } from 'minio'
import { Readable } from 'stream'

// Environment variables validation
const minioEndpoint = process.env.MINIO_ENDPOINT
const minioPort = process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : 9000
const minioAccessKey = process.env.MINIO_ACCESS_KEY
const minioSecretKey = process.env.MINIO_SECRET_KEY
const minioUseSSL = process.env.MINIO_USE_SSL === 'true'

if (!minioEndpoint) {
  throw new Error('Missing MINIO_ENDPOINT environment variable')
}

if (!minioAccessKey) {
  throw new Error('Missing MINIO_ACCESS_KEY environment variable')
}

if (!minioSecretKey) {
  throw new Error('Missing MINIO_SECRET_KEY environment variable')
}

// MinIO client configuration
export const minioClient = new MinIOClient({
  endPoint: minioEndpoint,
  port: minioPort,
  useSSL: minioUseSSL,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey,
})

// Bucket configuration
export const BUCKETS = {
  ATTACHMENTS: 'feedloop-attachments',
  THUMBNAILS: 'feedloop-thumbnails',
  EXPORTS: 'feedloop-exports',
  TEMP: 'feedloop-temp'
} as const

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS]

// Storage service class
export class StorageService {
  private static instance: StorageService
  private client: MinIOClient
  private initialized = false

  private constructor() {
    this.client = minioClient
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  // Initialize buckets and policies
  public async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Create buckets if they don't exist
      await Promise.all(
        Object.values(BUCKETS).map(bucket => this.ensureBucketExists(bucket))
      )

      // Set bucket policies
      await this.setBucketPolicies()

      this.initialized = true
      console.log('MinIO storage service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize MinIO storage service:', error)
      throw new StorageError('Storage service initialization failed', 'INIT_ERROR')
    }
  }

  // Ensure bucket exists
  private async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      const exists = await this.client.bucketExists(bucketName)

      if (!exists) {
        await this.client.makeBucket(bucketName)
        console.log(`Created bucket: ${bucketName}`)
      }
    } catch (error) {
      throw new StorageError(
        `Failed to create bucket ${bucketName}`,
        'BUCKET_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Set bucket policies for public access where needed
  private async setBucketPolicies(): Promise<void> {
    // Attachments bucket - private, accessible only with signed URLs
    const attachmentsPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${BUCKETS.ATTACHMENTS}/*`],
          Condition: {
            StringEquals: {
              's3:signedUrlExpires': '3600' // 1 hour
            }
          }
        }
      ]
    }

    // Thumbnails bucket - public read for quick access
    const thumbnailsPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${BUCKETS.THUMBNAILS}/*`]
        }
      ]
    }

    try {
      await this.client.setBucketPolicy(BUCKETS.ATTACHMENTS, JSON.stringify(attachmentsPolicy))
      await this.client.setBucketPolicy(BUCKETS.THUMBNAILS, JSON.stringify(thumbnailsPolicy))
    } catch (error) {
      console.warn('Could not set bucket policies (might not be supported):', error)
    }
  }

  // File upload methods
  public async uploadFile(
    bucketName: BucketName,
    objectName: string,
    data: Buffer | Readable,
    size?: number,
    metaData?: Record<string, string>
  ): Promise<{ etag: string; url: string }> {
    try {
      const uploadResult = await this.client.putObject(
        bucketName,
        objectName,
        data,
        size,
        metaData
      )

      const url = await this.getObjectUrl(bucketName, objectName)

      return {
        etag: uploadResult.etag,
        url
      }
    } catch (error) {
      throw new StorageError(
        `Failed to upload file ${objectName} to ${bucketName}`,
        'UPLOAD_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Upload from base64 data (for widget submissions)
  public async uploadFromBase64(
    bucketName: BucketName,
    objectName: string,
    base64Data: string,
    contentType: string,
    metaData?: Record<string, string>
  ): Promise<{ etag: string; url: string }> {
    try {
      const buffer = Buffer.from(base64Data, 'base64')
      const combinedMetaData = {
        'Content-Type': contentType,
        ...metaData
      }

      return await this.uploadFile(bucketName, objectName, buffer, buffer.length, combinedMetaData)
    } catch (error) {
      throw new StorageError(
        `Failed to upload base64 file ${objectName}`,
        'BASE64_UPLOAD_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Get object as stream
  public async getObjectStream(
    bucketName: BucketName,
    objectName: string
  ): Promise<Readable> {
    try {
      return await this.client.getObject(bucketName, objectName)
    } catch (error) {
      throw new StorageError(
        `Failed to get object stream for ${objectName}`,
        'GET_STREAM_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Get object as buffer
  public async getObjectBuffer(
    bucketName: BucketName,
    objectName: string
  ): Promise<Buffer> {
    try {
      const stream = await this.getObjectStream(bucketName, objectName)
      const chunks: Buffer[] = []

      return new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
      })
    } catch (error) {
      throw new StorageError(
        `Failed to get object buffer for ${objectName}`,
        'GET_BUFFER_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Get signed URL for secure access
  public async getSignedUrl(
    bucketName: BucketName,
    objectName: string,
    expiry: number = 3600 // 1 hour default
  ): Promise<string> {
    try {
      return await this.client.presignedGetObject(bucketName, objectName, expiry)
    } catch (error) {
      throw new StorageError(
        `Failed to generate signed URL for ${objectName}`,
        'SIGNED_URL_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Get public URL (for thumbnails and public assets)
  public async getObjectUrl(
    bucketName: BucketName,
    objectName: string
  ): Promise<string> {
    const protocol = minioUseSSL ? 'https' : 'http'
    const port = minioPort !== 80 && minioPort !== 443 ? `:${minioPort}` : ''
    return `${protocol}://${minioEndpoint}${port}/${bucketName}/${objectName}`
  }

  // Delete object
  public async deleteObject(
    bucketName: BucketName,
    objectName: string
  ): Promise<void> {
    try {
      await this.client.removeObject(bucketName, objectName)
    } catch (error) {
      throw new StorageError(
        `Failed to delete object ${objectName}`,
        'DELETE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Delete multiple objects
  public async deleteObjects(
    bucketName: BucketName,
    objectNames: string[]
  ): Promise<void> {
    try {
      await this.client.removeObjects(bucketName, objectNames)
    } catch (error) {
      throw new StorageError(
        `Failed to delete ${objectNames.length} objects`,
        'DELETE_BATCH_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Check if object exists
  public async objectExists(
    bucketName: BucketName,
    objectName: string
  ): Promise<boolean> {
    try {
      await this.client.statObject(bucketName, objectName)
      return true
    } catch (error) {
      return false
    }
  }

  // Get object metadata
  public async getObjectMetadata(
    bucketName: BucketName,
    objectName: string
  ): Promise<{
    size: number
    etag: string
    lastModified: Date
    metaData: Record<string, string>
  }> {
    try {
      const stat = await this.client.statObject(bucketName, objectName)
      return {
        size: stat.size,
        etag: stat.etag,
        lastModified: stat.lastModified,
        metaData: stat.metaData
      }
    } catch (error) {
      throw new StorageError(
        `Failed to get metadata for ${objectName}`,
        'METADATA_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // List objects with prefix
  public async listObjects(
    bucketName: BucketName,
    prefix?: string,
    recursive: boolean = false
  ): Promise<Array<{
    name: string
    size: number
    lastModified: Date
    etag: string
  }>> {
    try {
      const objects: Array<{
        name: string
        size: number
        lastModified: Date
        etag: string
      }> = []

      const stream = this.client.listObjects(bucketName, prefix, recursive)

      return new Promise((resolve, reject) => {
        stream.on('data', obj => {
          objects.push({
            name: obj.name || '',
            size: obj.size || 0,
            lastModified: obj.lastModified || new Date(),
            etag: obj.etag || ''
          })
        })
        stream.on('end', () => resolve(objects))
        stream.on('error', reject)
      })
    } catch (error) {
      throw new StorageError(
        `Failed to list objects in ${bucketName}`,
        'LIST_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Get storage statistics
  public async getStorageStats(bucketName: BucketName): Promise<{
    objectCount: number
    totalSize: number
  }> {
    try {
      const objects = await this.listObjects(bucketName, undefined, true)

      return {
        objectCount: objects.length,
        totalSize: objects.reduce((sum, obj) => sum + obj.size, 0)
      }
    } catch (error) {
      throw new StorageError(
        `Failed to get storage stats for ${bucketName}`,
        'STATS_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.bucketExists(BUCKETS.ATTACHMENTS)
      return true
    } catch (error) {
      console.error('Storage health check failed:', error)
      return false
    }
  }
}

// Custom error class for storage operations
export class StorageError extends Error {
  public code: string
  public details?: string

  constructor(message: string, code: string, details?: string) {
    super(message)
    this.name = 'StorageError'
    this.code = code
    this.details = details
  }
}

// Helper functions
export const generateObjectName = (
  projectId: string,
  filename: string,
  reportId?: string
): string => {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

  if (reportId) {
    return `projects/${projectId}/reports/${reportId}/${timestamp}_${randomSuffix}_${sanitizedFilename}`
  }

  return `projects/${projectId}/uploads/${timestamp}_${randomSuffix}_${sanitizedFilename}`
}

export const generateThumbnailName = (originalObjectName: string): string => {
  const pathParts = originalObjectName.split('.')
  const extension = pathParts.pop()
  return `${pathParts.join('.')}_thumb.webp`
}

export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : ''
}

export const validateFileSize = (size: number, maxSize: number = 5 * 1024 * 1024): boolean => {
  return size > 0 && size <= maxSize
}

export const validateContentType = (contentType: string): boolean => {
  const allowedTypes = [
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
  ]

  return allowedTypes.includes(contentType)
}

// Initialize storage service
export const storage = StorageService.getInstance()

// Export for convenience
export default storage