/**
 * Individual Report API Routes
 * T058: GET /api/projects/[id]/reports/[reportId] endpoint implementation
 * T059: PUT /api/projects/[id]/reports/[reportId] endpoint implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'
import { ServerSession } from '@/lib/auth/session'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
    reportId: string
  }
}

/**
 * GET /api/projects/[id]/reports/[reportId] - Get report details
 * Returns detailed information about a specific report including attachments
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authentication
    const user = await ServerSession.requireAuth()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const { id: projectId, reportId } = await params

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    if (!uuidRegex.test(reportId)) {
      return NextResponse.json(
        { error: 'Invalid report ID format' },
        { status: 400 }
      )
    }

    // Check if user has access to this project
    const hasAccess = await ServerSession.hasProjectAccess(projectId)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Get report details with attachments
    const { data: report, error: reportError } = await supabaseAdmin
      .from('fl_reports')
      .select(`
        id,
        title,
        description,
        type,
        status,
        priority,
        reporter_email,
        reporter_name,
        browser_info,
        page_url,
        created_at,
        updated_at,
        created_by,
        fl_attachments(
          id,
          filename,
          file_size,
          mime_type,
          file_url,
          created_at
        )
      `)
      .eq('id', reportId)
      .eq('project_id', projectId)
      .single()

    if (reportError || !report) {
      console.error('Error fetching report:', reportError)
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Get creator information if available
    let creatorInfo = null
    if (report.created_by) {
      const { data: creator } = await supabaseAdmin
        .from('fl_users')
        .select('email, first_name, last_name')
        .eq('id', report.created_by)
        .single()

      if (creator) {
        creatorInfo = {
          email: creator.email,
          name: `${creator.first_name} ${creator.last_name}`.trim()
        }
      }
    }

    // Return report with creator info
    return NextResponse.json({
      ...report,
      creator: creatorInfo
    })

  } catch (error) {
    console.error('Report detail API error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Validation schema for report updates
const UpdateReportSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  description: z.string()
    .min(1, 'Description is required')
    .max(10000, 'Description must be less than 10000 characters')
    .trim()
    .optional(),
  status: z.enum(['new', 'in_progress', 'resolved', 'closed'], {
    errorMap: () => ({ message: 'Status must be "new", "in_progress", "resolved", or "closed"' })
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Priority must be "low", "medium", "high", or "critical"' })
  }).optional(),
  type: z.enum(['bug', 'feature', 'feedback'], {
    errorMap: () => ({ message: 'Type must be "bug", "feature", or "feedback"' })
  }).optional()
})

/**
 * PUT /api/projects/[id]/reports/[reportId] - Update report
 * Updates report details, status, priority, etc.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authentication
    const user = await ServerSession.requireAuth()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const { id: projectId, reportId } = await params

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    if (!uuidRegex.test(reportId)) {
      return NextResponse.json(
        { error: 'Invalid report ID format' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = UpdateReportSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    // Check if user has access to this project
    const hasAccess = await ServerSession.hasProjectAccess(projectId)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Check if report exists and belongs to the project
    const { data: existingReport, error: reportError } = await supabaseAdmin
      .from('fl_reports')
      .select('id, created_by')
      .eq('id', reportId)
      .eq('project_id', projectId)
      .single()

    if (reportError || !existingReport) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    const updateData = validation.data

    // Only update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    const updatePayload = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    // Update the report
    const { data: updatedReport, error: updateError } = await supabaseAdmin
      .from('fl_reports')
      .update(updatePayload)
      .eq('id', reportId)
      .eq('project_id', projectId)
      .select(`
        id,
        title,
        description,
        type,
        status,
        priority,
        reporter_email,
        reporter_name,
        browser_info,
        page_url,
        created_at,
        updated_at,
        created_by
      `)
      .single()

    if (updateError) {
      console.error('Error updating report:', updateError)
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      )
    }

    // Get creator information if available
    let creatorInfo = null
    if (updatedReport.created_by) {
      const { data: creator } = await supabaseAdmin
        .from('fl_users')
        .select('email, first_name, last_name')
        .eq('id', updatedReport.created_by)
        .single()

      if (creator) {
        creatorInfo = {
          email: creator.email,
          name: `${creator.first_name} ${creator.last_name}`.trim()
        }
      }
    }

    // Get attachments
    const { data: attachments } = await supabaseAdmin
      .from('fl_attachments')
      .select(`
        id,
        filename,
        file_size,
        mime_type,
        file_url,
        created_at
      `)
      .eq('report_id', reportId)

    // Return the updated report with related data
    return NextResponse.json({
      ...updatedReport,
      creator: creatorInfo,
      fl_attachments: attachments || []
    })

  } catch (error) {
    console.error('Report update API error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}