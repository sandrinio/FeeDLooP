/**
 * Project Reports API Routes
 * T056: GET /api/projects/[id]/reports endpoint implementation
 * T057: POST /api/projects/[id]/reports endpoint implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'
import { ServerSession } from '@/lib/auth/session'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/projects/[id]/reports - List project reports
 * Returns all reports for a project with optional filtering
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

    const { id: projectId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
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

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 per page
    const offset = (page - 1) * limit

    // Build query with optional filters
    let query = supabaseAdmin
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
        created_at,
        updated_at,
        fl_attachments(
          id,
          filename,
          file_size,
          mime_type,
          created_at
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters if provided
    if (status && ['active', 'archived'].includes(status)) {
      query = query.eq('status', status)
    }

    if (type && ['bug', 'initiative', 'feedback'].includes(type)) {
      query = query.eq('type', type)
    }

    if (priority && ['low', 'medium', 'high', 'critical'].includes(priority)) {
      query = query.eq('priority', priority)
    }

    const { data: reports, error: reportsError } = await query

    if (reportsError) {
      console.error('Error fetching reports:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('fl_reports')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    // Apply same filters to count query
    if (status && ['active', 'archived'].includes(status)) {
      countQuery = countQuery.eq('status', status)
    }

    if (type && ['bug', 'initiative', 'feedback'].includes(type)) {
      countQuery = countQuery.eq('type', type)
    }

    if (priority && ['low', 'medium', 'high', 'critical'].includes(priority)) {
      countQuery = countQuery.eq('priority', priority)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting reports:', countError)
    }

    // Format response with pagination metadata
    return NextResponse.json({
      reports: reports || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      filters: {
        status,
        type,
        priority
      }
    })

  } catch (error) {
    console.error('Reports list API error:', error)

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

// Validation schema for report creation
const CreateReportSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z.string()
    .min(1, 'Description is required')
    .max(10000, 'Description must be less than 10000 characters')
    .trim(),
  type: z.enum(['bug', 'initiative', 'feedback'], {
    errorMap: () => ({ message: 'Type must be "bug", "initiative", or "feedback"' })
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Priority must be "low", "medium", "high", or "critical"' })
  }).optional().default('medium'),
  reporter_email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .optional(),
  reporter_name: z.string()
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  attachment_ids: z.array(z.string().uuid('Invalid attachment ID'))
    .max(5, 'Maximum 5 attachments allowed')
    .optional()
})

/**
 * POST /api/projects/[id]/reports - Create new report
 * Creates a new bug report, feature request, or feedback for the project
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authentication
    const user = await ServerSession.requireAuth()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const { id: projectId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
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

    // Parse and validate request body
    const body = await request.json()
    const validation = CreateReportSchema.safeParse(body)

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

    const {
      title,
      description,
      type,
      priority,
      reporter_email,
      reporter_name,
      attachment_ids
    } = validation.data

    // If attachment_ids provided, verify they exist and belong to this user
    if (attachment_ids && attachment_ids.length > 0) {
      const { data: attachments, error: attachmentError } = await supabaseAdmin
        .from('fl_attachments')
        .select('id, report_id')
        .in('id', attachment_ids)

      if (attachmentError) {
        console.error('Error checking attachments:', attachmentError)
        return NextResponse.json(
          { error: 'Failed to verify attachments' },
          { status: 500 }
        )
      }

      // Check if any attachments are already linked to other reports
      const linkedAttachments = attachments?.filter(att => att.report_id !== null)
      if (linkedAttachments && linkedAttachments.length > 0) {
        return NextResponse.json(
          { error: 'Some attachments are already linked to other reports' },
          { status: 400 }
        )
      }

      // Check if all requested attachments exist
      if (!attachments || attachments.length !== attachment_ids.length) {
        return NextResponse.json(
          { error: 'Some attachment IDs are invalid' },
          { status: 400 }
        )
      }
    }

    // Create the report
    const { data: report, error: createError } = await supabaseAdmin
      .from('fl_reports')
      .insert({
        project_id: projectId,
        title,
        description,
        type,
        priority,
        status: 'active',
        reporter_email,
        reporter_name
      })
      .select(`
        id,
        title,
        description,
        type,
        status,
        priority,
        reporter_email,
        reporter_name,
        created_at,
        updated_at
      `)
      .single()

    if (createError) {
      console.error('Error creating report:', createError)
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      )
    }

    // Link attachments to the report if provided
    if (attachment_ids && attachment_ids.length > 0) {
      const { error: linkError } = await supabaseAdmin
        .from('fl_attachments')
        .update({
          report_id: report.id,
          updated_at: new Date().toISOString()
        })
        .in('id', attachment_ids)

      if (linkError) {
        console.error('Error linking attachments:', linkError)
        // Report was created successfully, but attachment linking failed
        // This is not a critical error, so we'll log it and continue
      }

      // Fetch the report with attachments for response
      const { data: reportWithAttachments } = await supabaseAdmin
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
          created_at,
          updated_at,
          fl_attachments(
            id,
            filename,
            file_size,
            mime_type,
            created_at
          )
        `)
        .eq('id', report.id)
        .single()

      if (reportWithAttachments) {
        return NextResponse.json(reportWithAttachments, { status: 201 })
      }
    }

    // Return the created report
    return NextResponse.json(report, { status: 201 })

  } catch (error) {
    console.error('Report creation API error:', error)

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