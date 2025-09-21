/**
 * Widget Submit API Endpoint
 * T060: POST /api/widget/submit endpoint in app/api/widget/submit/route.ts
 *
 * Handles feedback submissions from the embeddable widget
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'
import { storage, BUCKETS } from '@/lib/storage/minio'
import { CreateWidgetReportSchema } from '@/lib/models/report'
import {
  WidgetAttachmentSchema,
  generateAttachmentPath,
  sanitizeFilename
} from '@/lib/models/attachment'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

// Configure runtime for the route
export const runtime = 'nodejs'

// CORS headers for widget embedding
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('Widget submit request received')

    // Initialize storage service
    // TODO: Re-enable when MinIO is properly configured
    // await storage.initialize()

    // Parse multipart form data
    const formData = await request.formData()
    console.log('Form data parsed successfully')

    // Extract form fields
    const projectKey = formData.get('project_key') as string
    console.log('Project key:', projectKey)
    const type = formData.get('type') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const name = formData.get('reporter_name') as string | null
    const email = formData.get('reporter_email') as string | null
    const priority = formData.get('priority') as string | null
    const url = formData.get('url') as string | null
    const userAgent = formData.get('user_agent') as string | null
    const consoleLogs = formData.get('console_logs') as string | null
    const networkRequests = formData.get('network_requests') as string | null

    // Enhanced v2.0.0+ widget data
    const performanceMetricsRaw = formData.get('performance_metrics') as string | null
    const interactionDataRaw = formData.get('interaction_data') as string | null
    const errorContextRaw = formData.get('error_context') as string | null

    // Check for compressed diagnostic data
    const compressedDiagnosticData = formData.get('diagnostic_data_compressed') as string | null
    const compressionType = formData.get('compression_type') as string | null
    const uncompressedDiagnosticData = formData.get('diagnostic_data') as string | null

    // Parse diagnostic data
    let parsedDiagnosticData = null
    let parsedConsoleLogs = null
    let parsedNetworkRequests = null

    // Parse enhanced v2.0.0+ diagnostic data
    let parsedPerformanceMetrics = null
    let parsedInteractionData = null
    let parsedErrorContext = null

    // Parse performance metrics
    if (performanceMetricsRaw) {
      try {
        parsedPerformanceMetrics = JSON.parse(performanceMetricsRaw)
        console.log('Successfully parsed performance metrics')
      } catch (error) {
        console.error('Failed to parse performance metrics:', error)
      }
    }

    // Parse interaction data
    if (interactionDataRaw) {
      try {
        parsedInteractionData = JSON.parse(interactionDataRaw)
        console.log('Successfully parsed interaction data')
      } catch (error) {
        console.error('Failed to parse interaction data:', error)
      }
    }

    // Parse error context
    if (errorContextRaw) {
      try {
        parsedErrorContext = JSON.parse(errorContextRaw)
        console.log('Successfully parsed error context')
      } catch (error) {
        console.error('Failed to parse error context:', error)
      }
    }

    // Handle compressed diagnostic data
    if (compressedDiagnosticData && compressionType === 'gzip') {
      try {
        // Decode base64 and decompress
        const compressed = Uint8Array.from(atob(compressedDiagnosticData), c => c.charCodeAt(0))
        const decompressed = await new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(compressed)
              controller.close()
            }
          }).pipeThrough(new DecompressionStream('gzip'))
        ).text()

        parsedDiagnosticData = JSON.parse(decompressed)
        console.log('Successfully decompressed diagnostic data:', {
          compressed: compressedDiagnosticData.length,
          decompressed: decompressed.length
        })
      } catch (error) {
        console.error('Failed to decompress diagnostic data:', error)
      }
    } else if (uncompressedDiagnosticData) {
      try {
        parsedDiagnosticData = JSON.parse(uncompressedDiagnosticData)
      } catch (error) {
        console.error('Failed to parse uncompressed diagnostic data:', error)
      }
    }

    // Extract console logs and network requests from parsed diagnostic data
    if (parsedDiagnosticData) {
      parsedConsoleLogs = parsedDiagnosticData.consoleLogs || parsedDiagnosticData.console_logs
      parsedNetworkRequests = parsedDiagnosticData.networkRequests || parsedDiagnosticData.network_requests
    }

    if (consoleLogs) {
      try {
        parsedConsoleLogs = JSON.parse(consoleLogs)
      } catch (error) {
        console.error('Failed to parse console logs:', error)
      }
    }

    if (networkRequests) {
      try {
        parsedNetworkRequests = JSON.parse(networkRequests)
      } catch (error) {
        console.error('Failed to parse network requests:', error)
      }
    }

    // Handle file attachments
    const files = formData.getAll('attachments') as File[]
    let attachmentData = []

    // Convert files to attachment format for validation
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.size > 0) { // Skip empty files
          // For validation, we only need filename, content_type, and size
          // base64_data will be processed separately
          attachmentData.push({
            filename: file.name,
            content_type: file.type,
            size: file.size
          })
        }
      }
    }

    // Prepare user info
    const userInfo = {
      name: name || null,
      email: email || null,
      browser: userAgent || null,
      os: null, // No OS info from widget
      url: url || null,
      screen_resolution: null, // No screen resolution from widget
    }

    // Prepare report data for validation
    const reportData = {
      project_key: projectKey,
      type,
      title,
      description,
      user_info: userInfo,
      diagnostic_data: {
        console_errors: parsedConsoleLogs ?
          parsedConsoleLogs
            .filter(log => log.type === 'error')
            .map(log => log.message)
            .slice(0, 50) : [],
        network_requests: parsedNetworkRequests ?
          parsedNetworkRequests
            .map(req => ({
              url: req.name || '',
              method: 'GET', // Default since widget doesn't capture method
              status: 200, // Default since widget doesn't capture status
              timestamp: new Date().toISOString(),
              duration: req.duration || 0
            }))
            .slice(0, 100) : []
      },
      // Enhanced v2.0.0+ diagnostic data
      performance_metrics: parsedPerformanceMetrics,
      interaction_data: parsedInteractionData,
      error_context: parsedErrorContext,
      attachments: attachmentData
    }

    // Validate the data
    console.log('About to validate report data:')
    console.log(JSON.stringify(reportData, null, 2))

    const validation = CreateWidgetReportSchema.safeParse(reportData)
    if (!validation.success) {
      console.error('Validation failed with errors:', validation.error)
      console.error('Full validation error:', JSON.stringify(validation.error, null, 2))
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error?.errors?.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })) || ['Unknown validation error']
        },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Validation passed successfully')
    const validatedData = validation.data

    // Verify project exists and get project_id
    console.log('Looking for project with integration_key:', validatedData.project_key)

    if (!supabaseAdmin) {
      throw new Error('Admin client not available')
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from('fl_projects')
      .select('id')
      .eq('integration_key', validatedData.project_key)
      .single()

    console.log('Project query result:', { project, projectError })

    if (projectError || !project) {
      console.error('Project not found - Error:', projectError)
      return NextResponse.json(
        { error: 'Invalid project key' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Create the report in the database (using actual schema)
    const { data: report, error: reportError } = await supabaseAdmin
      .from('fl_reports')
      .insert({
        project_id: project.id,
        type: validatedData.type,
        title: validatedData.title,
        description: validatedData.description,
        status: 'active', // Database enum uses 'active' not 'new'
        priority: 'medium', // Default priority for widget submissions
        reporter_name: validatedData.user_info?.name,
        reporter_email: validatedData.user_info?.email,
        url: validatedData.user_info?.url,
        user_agent: validatedData.user_info?.browser,
        console_logs: parsedConsoleLogs || null,
        network_requests: parsedNetworkRequests || null,
        // Enhanced v2.0.0+ diagnostic data
        performance_metrics: validatedData.performance_metrics || null,
        interaction_data: validatedData.interaction_data || null,
        error_context: validatedData.error_context || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (reportError) {
      console.error('Database error:', reportError)
      return NextResponse.json(
        { error: 'Failed to save report' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Process file attachments
    const uploadedAttachments = []
    const attachmentErrors = []

    for (let i = 0; i < validatedData.attachments.length; i++) {
      const attachment = validatedData.attachments[i]

      try {
        // Validate attachment
        const validAttachment = WidgetAttachmentSchema.parse(attachment)

        // Generate unique attachment ID
        const attachmentId = uuidv4()

        // Sanitize filename
        const originalFilename = validAttachment.filename
        const sanitizedFilename = sanitizeFilename(originalFilename)

        // Generate storage path
        const storagePath = generateAttachmentPath(project.id, report.id, sanitizedFilename)

        // Upload to MinIO
        const uploadResult = await storage.uploadFromBase64(
          BUCKETS.ATTACHMENTS,
          storagePath,
          validAttachment.base64_data,
          validAttachment.content_type,
          {
            'Original-Filename': originalFilename,
            'Project-ID': project.id,
            'Report-ID': report.id,
            'Attachment-ID': attachmentId
          }
        )

        // Create attachment record in database
        const { data: dbAttachment, error: attachmentError } = await supabaseAdmin
          .from('fl_attachments')
          .insert({
            id: attachmentId,
            project_id: project.id,
            report_id: report.id,
            filename: sanitizedFilename,
            original_filename: originalFilename,
            content_type: validAttachment.content_type,
            size: validAttachment.size,
            file_url: uploadResult.url,
            storage_path: storagePath,
            status: 'ready',
            scan_status: 'pending',
            uploaded_by: null, // No user auth for widget submissions
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (attachmentError) {
          console.error('Failed to save attachment record:', attachmentError)
          // Clean up uploaded file
          try {
            await storage.deleteObject(BUCKETS.ATTACHMENTS, storagePath)
          } catch (cleanupError) {
            console.error('Failed to cleanup uploaded file:', cleanupError)
          }
          attachmentErrors.push({
            filename: originalFilename,
            error: 'Failed to save attachment record'
          })
        } else {
          uploadedAttachments.push({
            id: dbAttachment.id,
            filename: dbAttachment.filename,
            original_filename: dbAttachment.original_filename,
            url: dbAttachment.file_url,
            size: dbAttachment.size,
            content_type: dbAttachment.content_type
          })
        }

      } catch (error) {
        console.error(`Error processing attachment ${attachment.filename}:`, error)
        attachmentErrors.push({
          filename: attachment.filename || `file_${i}`,
          error: error instanceof Error ? error.message : 'Processing failed'
        })
      }
    }

    const response = {
      success: true,
      message: 'Feedback submitted successfully',
      report_id: report.id,
      attachments_uploaded: uploadedAttachments.length,
      total_attachments: validatedData.attachments.length
    }

    // Include attachment details if there were uploads
    if (uploadedAttachments.length > 0) {
      response.attachments = uploadedAttachments
    }

    // Include errors if any occurred
    if (attachmentErrors.length > 0) {
      response.attachment_errors = attachmentErrors
    }

    return NextResponse.json(response, { status: 201, headers: corsHeaders })

  } catch (error) {
    console.error('Widget submit error:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors?.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })) || ['Unknown validation error']
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