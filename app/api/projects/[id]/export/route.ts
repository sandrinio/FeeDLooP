/**
 * CSV Export API Routes
 * T062: GET /api/projects/[id]/export endpoint implementation
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

// Validation schema for export parameters
const ExportQuerySchema = z.object({
  format: z.enum(['csv']).default('csv'),
  type: z.enum(['bug', 'initiative', 'feedback']).optional(),
  status: z.enum(['active', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  from: z.string().refine(date => !date || !isNaN(Date.parse(date)), {
    message: 'Invalid date format for "from" parameter'
  }).optional(),
  to: z.string().refine(date => !date || !isNaN(Date.parse(date)), {
    message: 'Invalid date format for "to" parameter'
  }).optional(),
  template: z.enum(['default', 'jira', 'azure']).default('default'),
  include_attachments: z.enum(['true', 'false']).default('false'),
  include_diagnostic: z.enum(['true', 'false']).default('false')
})

/**
 * GET /api/projects/[id]/export - Export project reports as CSV
 * Supports filtering by type, status, priority, date range, and various templates
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validation = ExportQuerySchema.safeParse(queryParams)

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
      format,
      type,
      status,
      priority,
      from,
      to,
      template,
      include_attachments,
      include_diagnostic
    } = validation.data

    // Build base query
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
        url,
        user_agent,
        console_logs,
        network_requests,
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

    // Apply filters
    if (type) {
      query = query.eq('type', type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (from) {
      query = query.gte('created_at', new Date(from).toISOString())
    }

    if (to) {
      query = query.lte('created_at', new Date(to).toISOString())
    }

    const { data: reports, error: reportsError } = await query

    if (reportsError) {
      console.error('Error fetching reports for export:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      )
    }

    // Generate CSV content based on template
    const csvContent = generateCSV(reports || [], {
      template,
      include_attachments: include_attachments === 'true',
      include_diagnostic: include_diagnostic === 'true'
    })

    // Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `feedloop-export-${dateStr}.csv`

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Export API error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate CSV content based on template and options
 */
function generateCSV(
  reports: any[],
  options: {
    template: 'default' | 'jira' | 'azure'
    include_attachments: boolean
    include_diagnostic: boolean
  }
): string {
  const { template, include_attachments, include_diagnostic } = options

  // Define headers based on template
  let headers: string[] = []

  switch (template) {
    case 'jira':
      headers = ['Issue Type', 'Summary', 'Description', 'Priority', 'Status', 'Reporter']
      if (include_attachments) headers.push('Attachments')
      if (include_diagnostic) headers.push('Browser', 'OS', 'Page URL', 'Console Errors')
      break

    case 'azure':
      headers = ['Work Item Type', 'Title', 'Description', 'State', 'Priority', 'Created By']
      if (include_attachments) headers.push('Attachments')
      if (include_diagnostic) headers.push('Browser', 'OS', 'Page URL', 'Console Errors')
      break

    default: // 'default'
      headers = ['ID', 'Type', 'Title', 'Description', 'Status', 'Priority', 'Created At', 'User Name', 'User Email']
      if (include_attachments) headers.push('Attachments')
      if (include_diagnostic) headers.push('Browser', 'OS', 'Page URL', 'Console Errors')
      break
  }

  // Build CSV rows
  const rows = [headers.join(',')]

  for (const report of reports) {
    const row: string[] = []

    switch (template) {
      case 'jira':
        row.push(
          escapeCSVField(mapTypeToJira(report.type)),
          escapeCSVField(report.title),
          escapeCSVField(report.description),
          escapeCSVField(capitalizeFirst(report.priority || '')),
          escapeCSVField(mapStatusToJira(report.status)),
          escapeCSVField(report.reporter_name || report.reporter_email || '')
        )
        break

      case 'azure':
        row.push(
          escapeCSVField(mapTypeToAzure(report.type)),
          escapeCSVField(report.title),
          escapeCSVField(report.description),
          escapeCSVField(mapStatusToAzure(report.status)),
          escapeCSVField(capitalizeFirst(report.priority || '')),
          escapeCSVField(report.reporter_name || report.reporter_email || '')
        )
        break

      default: // 'default'
        row.push(
          escapeCSVField(report.id),
          escapeCSVField(capitalizeFirst(report.type)),
          escapeCSVField(report.title),
          escapeCSVField(report.description),
          escapeCSVField(capitalizeFirst(report.status)),
          escapeCSVField(capitalizeFirst(report.priority || '')),
          escapeCSVField(new Date(report.created_at).toLocaleString()),
          escapeCSVField(report.reporter_name || ''),
          escapeCSVField(report.reporter_email || '')
        )
        break
    }

    // Add attachments if requested
    if (include_attachments) {
      const attachments = report.fl_attachments || []
      const attachmentNames = attachments.map((att: any) => att.filename).join('; ')
      row.push(escapeCSVField(attachmentNames))
    }

    // Add diagnostic data if requested
    if (include_diagnostic) {
      const userAgent = report.user_agent || ''
      const browser = extractBrowser(userAgent)
      const os = extractOS(userAgent)
      const pageUrl = report.url || ''
      const consoleErrors = report.console_logs ?
        JSON.stringify(report.console_logs).slice(0, 100) + '...' : ''

      row.push(
        escapeCSVField(browser),
        escapeCSVField(os),
        escapeCSVField(pageUrl),
        escapeCSVField(consoleErrors)
      )
    }

    rows.push(row.join(','))
  }

  return rows.join('\n')
}

/**
 * Escape CSV fields (handle commas, quotes, newlines)
 */
function escapeCSVField(field: string): string {
  if (!field) return ''

  const stringField = String(field)

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`
  }

  return stringField
}

/**
 * Map report types to Jira issue types
 */
function mapTypeToJira(type: string): string {
  switch (type) {
    case 'bug': return 'Bug'
    case 'initiative': return 'Story'
    case 'feedback': return 'Task'
    default: return 'Task'
  }
}

/**
 * Map report types to Azure DevOps work item types
 */
function mapTypeToAzure(type: string): string {
  switch (type) {
    case 'bug': return 'Bug'
    case 'initiative': return 'Feature'
    case 'feedback': return 'Task'
    default: return 'Task'
  }
}

/**
 * Map report status to Jira status
 */
function mapStatusToJira(status: string): string {
  switch (status) {
    case 'active': return 'To Do'
    case 'archived': return 'Done'
    default: return 'To Do'
  }
}

/**
 * Map report status to Azure DevOps state
 */
function mapStatusToAzure(status: string): string {
  switch (status) {
    case 'active': return 'New'
    case 'archived': return 'Closed'
    default: return 'New'
  }
}

/**
 * Capitalize first letter of string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Extract browser from user agent string
 */
function extractBrowser(userAgent: string): string {
  if (!userAgent) return ''

  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'

  return 'Unknown'
}

/**
 * Extract OS from user agent string
 */
function extractOS(userAgent: string): string {
  if (!userAgent) return ''

  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac OS')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iOS')) return 'iOS'

  return 'Unknown'
}