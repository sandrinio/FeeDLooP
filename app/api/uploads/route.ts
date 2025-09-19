/**
 * File Upload API Endpoint
 * T061: POST /api/uploads endpoint with MinIO integration
 *
 * Handles file uploads with MinIO storage integration
 * Supports both direct file uploads and base64 data from widget
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/database/supabase'
import { storage, BUCKETS, generateObjectName } from '@/lib/storage/minio'
import {
  FileUploadSchema,
  WidgetAttachmentSchema,
  generateAttachmentPath,
  sanitizeFilename,
  validateFileType,
  validateFileSize,
  isImageFile,
  formatFileSize
} from '@/lib/models/attachment'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

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
    // Initialize storage service
    await storage.initialize()

    const contentType = request.headers.get('content-type') || ''

    // Handle multipart/form-data (direct file uploads)
    if (contentType.includes('multipart/form-data')) {
      return await handleMultipartUpload(request)
    }

    // Handle JSON (base64 widget uploads)
    if (contentType.includes('application/json')) {
      return await handleJsonUpload(request)
    }

    return NextResponse.json(
      { error: 'Unsupported content type' },
      { status: 400, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Upload endpoint error:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleMultipartUpload(request: NextRequest) {
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

  // Verify project exists
  const { data: project, error: projectError } = await supabase
    .from('fl_projects')
    .select('id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Invalid project ID' },
      { status: 400, headers: corsHeaders }
    )
  }

  // Verify report exists if provided
  if (reportId) {
    const { data: report, error: reportError } = await supabase
      .from('fl_reports')
      .select('id')
      .eq('id', reportId)
      .eq('project_id', projectId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400, headers: corsHeaders }
      )
    }
  }

  // Get uploaded files
  const files = formData.getAll('files') as File[]

  if (!files || files.length === 0) {
    return NextResponse.json(
      { error: 'No files provided' },
      { status: 400, headers: corsHeaders }
    )
  }

  // Limit to 5 files per upload
  if (files.length > 5) {
    return NextResponse.json(
      { error: 'Maximum 5 files allowed per upload' },
      { status: 400, headers: corsHeaders }
    )
  }

  const uploadResults = []
  const errors = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    try {
      // Validate file
      const validation = FileUploadSchema.safeParse({
        filename: file.name,
        content_type: file.type,
        size: file.size,
        project_id: projectId,
        report_id: reportId,
        description
      })

      if (!validation.success) {
        errors.push({
          file: file.name,
          error: validation.error.errors[0].message
        })
        continue
      }

      // Process the upload
      const result = await processFileUpload(file, projectId, reportId, description)
      uploadResults.push(result)

    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error)
      errors.push({
        file: file.name,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  }

  return NextResponse.json(
    {
      success: true,
      uploaded: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${uploadResults.length} of ${files.length} files`
    },
    { status: 201, headers: corsHeaders }
  )
}

async function handleJsonUpload(request: NextRequest) {
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

  // Verify project exists
  const { data: project, error: projectError } = await supabase
    .from('fl_projects')
    .select('id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Invalid project ID' },
      { status: 400, headers: corsHeaders }
    )
  }

  // Verify report exists if provided
  if (reportId) {
    const { data: report, error: reportError } = await supabase
      .from('fl_reports')
      .select('id')
      .eq('id', reportId)
      .eq('project_id', projectId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400, headers: corsHeaders }
      )
    }
  }

  const uploadResults = []
  const errors = []

  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i]

    try {
      // Validate attachment data
      const validation = WidgetAttachmentSchema.safeParse(attachment)

      if (!validation.success) {
        errors.push({
          file: attachment.filename || `file_${i}`,
          error: validation.error.errors[0].message
        })
        continue
      }

      // Process the base64 upload
      const result = await processBase64Upload(
        validation.data,
        projectId,
        reportId,
        description
      )
      uploadResults.push(result)

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

async function processFileUpload(
  file: File,
  projectId: string,
  reportId: string | null,
  description: string | null
): Promise<{
  id: string
  filename: string
  original_filename: string
  url: string
  size: number
  content_type: string
}> {
  // Generate unique attachment ID
  const attachmentId = uuidv4()

  // Sanitize filename
  const originalFilename = file.name
  const sanitizedFilename = sanitizeFilename(originalFilename)

  // Generate storage path
  const storagePath = generateAttachmentPath(projectId, reportId, sanitizedFilename)

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload to MinIO
  const uploadResult = await storage.uploadFile(
    BUCKETS.ATTACHMENTS,
    storagePath,
    buffer,
    buffer.length,
    {
      'Content-Type': file.type,
      'Original-Filename': originalFilename,
      'Project-ID': projectId,
      'Report-ID': reportId || '',
      'Attachment-ID': attachmentId
    }
  )

  // Create attachment record in database
  const { data: attachment, error: dbError } = await supabase
    .from('fl_attachments')
    .insert({
      id: attachmentId,
      project_id: projectId,
      report_id: reportId,
      filename: sanitizedFilename,
      original_filename: originalFilename,
      content_type: file.type,
      size: file.size,
      url: uploadResult.url,
      storage_path: storagePath,
      status: 'ready',
      description,
      scan_status: 'pending',
      uploaded_by: null, // No user auth for this endpoint
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (dbError) {
    // Clean up uploaded file if database insert fails
    try {
      await storage.deleteObject(BUCKETS.ATTACHMENTS, storagePath)
    } catch (cleanupError) {
      console.error('Failed to cleanup uploaded file:', cleanupError)
    }
    throw new Error('Failed to save attachment record')
  }

  return {
    id: attachment.id,
    filename: attachment.filename,
    original_filename: attachment.original_filename,
    url: attachment.url,
    size: attachment.size,
    content_type: attachment.content_type
  }
}

async function processBase64Upload(
  attachment: { filename: string; content_type: string; size: number; base64_data: string },
  projectId: string,
  reportId: string | null,
  description: string | null
): Promise<{
  id: string
  filename: string
  original_filename: string
  url: string
  size: number
  content_type: string
}> {
  // Generate unique attachment ID
  const attachmentId = uuidv4()

  // Sanitize filename
  const originalFilename = attachment.filename
  const sanitizedFilename = sanitizeFilename(originalFilename)

  // Generate storage path
  const storagePath = generateAttachmentPath(projectId, reportId, sanitizedFilename)

  // Upload base64 data to MinIO
  const uploadResult = await storage.uploadFromBase64(
    BUCKETS.ATTACHMENTS,
    storagePath,
    attachment.base64_data,
    attachment.content_type,
    {
      'Original-Filename': originalFilename,
      'Project-ID': projectId,
      'Report-ID': reportId || '',
      'Attachment-ID': attachmentId
    }
  )

  // Create attachment record in database
  const { data: dbAttachment, error: dbError } = await supabase
    .from('fl_attachments')
    .insert({
      id: attachmentId,
      project_id: projectId,
      report_id: reportId,
      filename: sanitizedFilename,
      original_filename: originalFilename,
      content_type: attachment.content_type,
      size: attachment.size,
      url: uploadResult.url,
      storage_path: storagePath,
      status: 'ready',
      description,
      scan_status: 'pending',
      uploaded_by: null, // No user auth for this endpoint
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (dbError) {
    // Clean up uploaded file if database insert fails
    try {
      await storage.deleteObject(BUCKETS.ATTACHMENTS, storagePath)
    } catch (cleanupError) {
      console.error('Failed to cleanup uploaded file:', cleanupError)
    }
    throw new Error('Failed to save attachment record')
  }

  return {
    id: dbAttachment.id,
    filename: dbAttachment.filename,
    original_filename: dbAttachment.original_filename,
    url: dbAttachment.url,
    size: dbAttachment.size,
    content_type: dbAttachment.content_type
  }
}