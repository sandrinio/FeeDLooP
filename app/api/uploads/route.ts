/**
 * File Upload API Endpoint
 * T021: POST /api/uploads endpoint with MinIO integration
 * T086: File upload service with MinIO integration
 *
 * Handles file uploads with MinIO storage integration
 * Supports both direct file uploads and base64 data from widget
 * Updated to use the new upload service layer
 */

import { NextRequest, NextResponse } from 'next/server'
import { ServerSession } from '@/lib/auth/session'
import { uploadService } from '@/lib/services/uploadService'
import { DatabaseError } from '@/lib/database/supabase'
import { StorageError } from '@/lib/storage/minio'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication (for authenticated endpoints)
    let user = null
    try {
      user = await ServerSession.requireAuth()
    } catch (authError) {
      // Allow unauthenticated requests (for widget uploads)
      // Check if Authorization header is present but invalid
      const authHeader = request.headers.get('authorization')
      if (authHeader) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: corsHeaders }
        )
      }
    }

    const contentType = request.headers.get('content-type') || ''

    // Handle multipart/form-data (direct file uploads)
    if (contentType.includes('multipart/form-data')) {
      return await handleMultipartUpload(request, user)
    }

    // Handle JSON (base64 widget uploads)
    if (contentType.includes('application/json')) {
      return await handleJsonUpload(request, user)
    }

    return NextResponse.json(
      { error: 'Unsupported content type' },
      { status: 400, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Upload endpoint error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      )
    }

    if (error instanceof DatabaseError) {
      if (error.code === 'FILE_TOO_LARGE') {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 5MB' },
          { status: 413, headers: corsHeaders }
        )
      }

      if (error.code === 'UNSUPPORTED_FILE_TYPE') {
        return NextResponse.json(
          { error: 'File type not supported' },
          { status: 400, headers: corsHeaders }
        )
      }

      if (error.code === 'CONTENT_TYPE_MISMATCH') {
        return NextResponse.json(
          { error: 'File content type and extension mismatch' },
          { status: 400, headers: corsHeaders }
        )
      }

      if (error.code === 'VALIDATION_ERROR') {
        return NextResponse.json(
          { error: error.message },
          { status: 400, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500, headers: corsHeaders }
      )
    }

    if (error instanceof StorageError) {
      return NextResponse.json(
        { error: 'Storage error occurred' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleMultipartUpload(request: NextRequest, user: any) {
  const formData = await request.formData()

  // Extract metadata
  const projectId = formData.get('project_id') as string
  const reportId = formData.get('report_id') as string | null
  const description = formData.get('description') as string | null

  if (!projectId) {
    return NextResponse.json(
      { error: 'project_id is required' },
      { status: 400, headers: corsHeaders }
    )
  }

  // Check project access if user is authenticated
  if (user) {
    const hasAccess = await ServerSession.hasProjectAccess(projectId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404, headers: corsHeaders }
      )
    }
  }

  // Check for single file upload (matches contract test)
  const singleFile = formData.get('file') as File | null
  if (singleFile) {
    try {
      const fileData = await processFile(singleFile)
      const uploadedFile = await uploadService.uploadFile(fileData, {
        project_id: projectId,
        report_id: reportId || undefined,
        description: description || undefined,
        user_id: user?.user_id
      })

      return NextResponse.json(
        { file: mapToContractFormat(uploadedFile, projectId) },
        { status: 201, headers: corsHeaders }
      )
    } catch (error) {
      throw error // Let the main error handler deal with it
    }
  }

  // Check for multiple file upload (matches contract test)
  const multipleFiles = formData.getAll('files') as File[]
  if (multipleFiles.length > 0) {
    try {
      // Limit to 5 files per upload
      if (multipleFiles.length > 5) {
        return NextResponse.json(
          { error: 'Maximum 5 files allowed per upload' },
          { status: 400, headers: corsHeaders }
        )
      }

      const filesData = await Promise.all(
        multipleFiles.map(file => processFile(file))
      )

      const uploadedFiles = await uploadService.uploadFiles(filesData, {
        project_id: projectId,
        report_id: reportId || undefined,
        description: description || undefined,
        user_id: user?.user_id
      })

      return NextResponse.json(
        { files: uploadedFiles.map(file => mapToContractFormat(file, projectId)) },
        { status: 201, headers: corsHeaders }
      )
    } catch (error) {
      throw error // Let the main error handler deal with it
    }
  }

  // No files provided
  return NextResponse.json(
    { error: 'No files provided. Use "file" for single upload or "files" for multiple uploads' },
    { status: 400, headers: corsHeaders }
  )
}

async function handleJsonUpload(request: NextRequest, user: any) {
  const body = await request.json()

  // Extract data
  const {
    project_id: projectId,
    report_id: reportId,
    attachments = [],
    description
  } = body

  if (!projectId) {
    return NextResponse.json(
      { error: 'project_id is required' },
      { status: 400, headers: corsHeaders }
    )
  }

  if (!Array.isArray(attachments) || attachments.length === 0) {
    return NextResponse.json(
      { error: 'No attachments provided' },
      { status: 400, headers: corsHeaders }
    )
  }

  // Limit to 5 files per upload
  if (attachments.length > 5) {
    return NextResponse.json(
      { error: 'Maximum 5 files allowed per upload' },
      { status: 400, headers: corsHeaders }
    )
  }

  // Check project access if user is authenticated
  if (user) {
    const hasAccess = await ServerSession.hasProjectAccess(projectId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404, headers: corsHeaders }
      )
    }
  }

  const uploadResults = []
  const errors = []

  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i]

    try {
      if (!attachment.filename || !attachment.content_type || !attachment.base64_data) {
        errors.push({
          file: attachment.filename || `file_${i}`,
          error: 'Missing required fields (filename, content_type, base64_data)'
        })
        continue
      }

      // Upload using service
      const result = await uploadService.uploadFromBase64(
        attachment.base64_data,
        attachment.filename,
        attachment.content_type,
        {
          project_id: projectId,
          report_id: reportId || undefined,
          description: description || undefined,
          user_id: user?.user_id
        }
      )

      uploadResults.push(mapToContractFormat(result, projectId))

    } catch (error) {
      console.error(`Error uploading attachment ${attachment.filename}:`, error)
      errors.push({
        file: attachment.filename || `file_${i}`,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  }

  return NextResponse.json(
    {
      success: true,
      uploaded: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${uploadResults.length} of ${attachments.length} files`
    },
    { status: 201, headers: corsHeaders }
  )
}

/**
 * Process File object to extract necessary data
 */
async function processFile(file: File): Promise<{
  filename: string
  buffer: Buffer
  content_type: string
  size: number
}> {
  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return {
    filename: file.name,
    buffer,
    content_type: file.type,
    size: file.size
  }
}

/**
 * Map upload service result to contract test format
 */
function mapToContractFormat(uploadedFile: any, projectId: string): any {
  return {
    id: uploadedFile.id,
    filename: uploadedFile.filename,
    content_type: uploadedFile.content_type,
    size: uploadedFile.size,
    url: uploadedFile.url,
    project_id: projectId,
    report_id: uploadedFile.report_id || undefined,
    description: uploadedFile.description || undefined,
    uploaded_at: uploadedFile.created_at,
    scan_status: uploadedFile.scan_status,
    scan_result: uploadedFile.scan_result
  }
}