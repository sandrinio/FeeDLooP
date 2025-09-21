/**
 * T020: Reports Export API Endpoint
 * POST /api/projects/[id]/reports/export - Export reports in various formats
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

// Export configuration validation schema
const ExportConfigSchema = z.object({
  format: z.enum(['csv', 'json'], {
    errorMap: () => ({ message: 'Format must be "csv" or "json"' })
  }),
  report_ids: z.array(z.string().uuid('Invalid report ID')).optional(),
  filters: z.object({
    title: z.string().optional(),
    type: z.enum(['bug', 'initiative', 'feedback', 'all']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical', 'all']).optional(),
    reporter: z.string().optional(),
    dateRange: z.object({
      from: z.string().datetime().optional().nullable(),
      to: z.string().datetime().optional().nullable()
    }).optional()
  }).optional(),
  include_fields: z.object({
    title: z.boolean().default(true),
    description: z.boolean().default(true),
    type: z.boolean().default(true),
    priority: z.boolean().default(true),
    reporter: z.boolean().default(true),
    url: z.boolean().default(true),
    created_at: z.boolean().default(true),
    console_logs: z.boolean().default(false),
    network_requests: z.boolean().default(false)
  }),
  template: z.enum(['default', 'jira', 'azure_devops']).default('default')
})

/**
 * POST /api/projects/[id]/reports/export - Export reports
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
    const validation = ExportConfigSchema.safeParse(body)

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
      report_ids,
      filters,
      include_fields,
      template
    } = validation.data

    // Build query based on filters or specific report IDs
    let query = supabaseAdmin
      .from('fl_reports')
      .select(`
        id,
        title,
        description,
        type,
        priority,
        reporter_email,
        reporter_name,
        url,
        console_logs,
        network_requests,
        created_at,
        updated_at
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    // Filter by specific report IDs if provided
    if (report_ids && report_ids.length > 0) {
      query = query.in('id', report_ids)
    } else if (filters) {
      // Apply filters if no specific IDs provided
      if (filters.title) {
        query = query.or(`title.ilike.%${filters.title}%,description.ilike.%${filters.title}%`)
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }
      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
      }
      if (filters.reporter) {
        query = query.or(`reporter_name.ilike.%${filters.reporter}%,reporter_email.ilike.%${filters.reporter}%`)
      }
      if (filters.dateRange?.from) {
        query = query.gte('created_at', filters.dateRange.from)
      }
      if (filters.dateRange?.to) {
        query = query.lte('created_at', filters.dateRange.to)
      }
    }

    const { data: reports, error: reportsError } = await query as { data: any[] | null, error: any }

    if (reportsError) {
      console.error('Error fetching reports for export:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch reports for export' },
        { status: 500 }
      )
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json(
        { error: 'No reports found matching the criteria' },
        { status: 404 }
      )
    }

    // Process reports based on included fields
    const processedReports = reports.map((report: any) => {
      const processedReport: any = {}

      // Map fields based on template
      const fieldMapping = getFieldMapping(template)

      if (include_fields.title) {
        processedReport[fieldMapping.title] = report.title
      }
      if (include_fields.description) {
        processedReport[fieldMapping.description] = report.description
      }
      if (include_fields.type) {
        processedReport[fieldMapping.type] = report.type
      }
      if (include_fields.priority) {
        processedReport[fieldMapping.priority] = report.priority || 'none'
      }
      if (include_fields.reporter) {
        processedReport[fieldMapping.reporter] = report.reporter_name || report.reporter_email || 'anonymous'
      }
      if (include_fields.url) {
        processedReport[fieldMapping.url] = report.url || ''
      }
      if (include_fields.created_at) {
        processedReport[fieldMapping.created_at] = new Date(report.created_at).toISOString()
      }
      if (include_fields.console_logs) {
        processedReport[fieldMapping.console_logs] = JSON.stringify(report.console_logs || [])
      }
      if (include_fields.network_requests) {
        processedReport[fieldMapping.network_requests] = JSON.stringify(report.network_requests || [])
      }

      return processedReport
    })

    // Generate export based on format
    if (format === 'json') {
      return NextResponse.json(processedReports, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="feedloop-reports-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    } else {
      // Generate CSV
      const csv = generateCSV(processedReports)
      const templateSuffix = template !== 'default' ? `-${template}` : ''

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="feedloop-reports${templateSuffix}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

  } catch (error) {
    console.error('Reports export API error:', error)

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

/**
 * Get field mapping based on export template
 */
function getFieldMapping(template: string) {
  switch (template) {
    case 'jira':
      return {
        title: 'Summary',
        description: 'Description',
        type: 'Issue Type',
        priority: 'Priority',
        reporter: 'Reporter',
        url: 'URL',
        created_at: 'Created',
        console_logs: 'Console Logs',
        network_requests: 'Network Requests'
      }
    case 'azure_devops':
      return {
        title: 'Title',
        description: 'Description',
        type: 'Work Item Type',
        priority: 'Priority',
        reporter: 'Assigned To',
        url: 'URL',
        created_at: 'Created Date',
        console_logs: 'Console Logs',
        network_requests: 'Network Requests'
      }
    default:
      return {
        title: 'Title',
        description: 'Description',
        type: 'Type',
        priority: 'Priority',
        reporter: 'Reporter',
        url: 'URL',
        created_at: 'Created At',
        console_logs: 'Console Logs',
        network_requests: 'Network Requests'
      }
  }
}

/**
 * Generate CSV from processed reports
 */
function generateCSV(reports: any[]): string {
  if (reports.length === 0) {
    return ''
  }

  // Get headers from first report
  const headers = Object.keys(reports[0])

  // Escape CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) {
      return ''
    }

    const stringValue = String(value)

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }

    return stringValue
  }

  // Build CSV
  const csvLines = []

  // Add headers
  csvLines.push(headers.map(header => escapeCSV(header)).join(','))

  // Add data rows
  reports.forEach(report => {
    const row = headers.map(header => escapeCSV(report[header]))
    csvLines.push(row.join(','))
  })

  return csvLines.join('\n')
}