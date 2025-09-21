/**
 * T020: Enhanced Reports Export API Endpoint
 * POST /api/projects/[id]/reports/export - Export reports in various formats with enhanced data
 * Enhanced Log Visualization - Phase 6: Advanced export functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'
import { ServerSession } from '@/lib/auth/session'
import { z } from 'zod'
import { utils, writeFile } from 'xlsx'
import { createReadStream } from 'fs'
import { promisify } from 'util'
import { gzip } from 'zlib'
const gzipAsync = promisify(gzip)

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Enhanced export configuration validation schema
const ExportConfigSchema = z.object({
  format: z.enum(['csv', 'json', 'excel', 'ndjson'], {
    errorMap: () => ({ message: 'Format must be "csv", "json", "excel", or "ndjson"' })
  }),
  compression: z.boolean().default(false),
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
    network_requests: z.boolean().default(false),
    // Enhanced fields
    performance_metrics: z.boolean().default(false),
    interaction_data: z.boolean().default(false),
    error_context: z.boolean().default(false),
    user_agent: z.boolean().default(false),
    viewport: z.boolean().default(false),
    attachments: z.boolean().default(false)
  }),
  data_format: z.enum(['flattened', 'structured']).default('flattened'),
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
      compression,
      report_ids,
      filters,
      include_fields,
      data_format,
      template
    } = validation.data

    // Build enhanced query based on filters or specific report IDs
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
        updated_at,
        performance_metrics,
        interaction_data,
        error_context,
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

    // Process reports based on included fields and data format
    const processedReports = reports.map((report: any) => {
      return processReportData(report, include_fields, template, data_format)
    })

    // Generate export based on format
    const timestamp = new Date().toISOString().split('T')[0]
    const templateSuffix = template !== 'default' ? `-${template}` : ''
    const baseFilename = `feedloop-reports${templateSuffix}-${timestamp}`

    switch (format) {
      case 'json': {
        const content = JSON.stringify(processedReports, null, 2)
        return await createResponse(content, 'application/json', `${baseFilename}.json`, compression)
      }
      case 'ndjson': {
        const content = processedReports.map(report => JSON.stringify(report)).join('\n')
        return await createResponse(content, 'application/x-ndjson', `${baseFilename}.ndjson`, compression)
      }
      case 'excel': {
        const buffer = generateExcel(processedReports, template)
        const content = Buffer.from(buffer).toString('base64')
        return await createResponse(content, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `${baseFilename}.xlsx`, compression, true)
      }
      case 'csv':
      default: {
        const content = generateCSV(processedReports)
        return await createResponse(content, 'text/csv', `${baseFilename}.csv`, compression)
      }
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
 * Process report data based on included fields and data format
 */
function processReportData(report: any, includeFields: any, template: string, dataFormat: string) {
  const fieldMapping = getFieldMapping(template)
  const processedReport: any = {}

  // Basic fields
  if (includeFields.title) {
    processedReport[fieldMapping.title] = report.title
  }
  if (includeFields.description) {
    processedReport[fieldMapping.description] = report.description
  }
  if (includeFields.type) {
    processedReport[fieldMapping.type] = report.type
  }
  if (includeFields.priority) {
    processedReport[fieldMapping.priority] = report.priority || 'none'
  }
  if (includeFields.reporter) {
    processedReport[fieldMapping.reporter] = report.reporter_name || report.reporter_email || 'anonymous'
  }
  if (includeFields.url) {
    processedReport[fieldMapping.url] = report.url || ''
  }
  if (includeFields.created_at) {
    processedReport[fieldMapping.created_at] = new Date(report.created_at).toISOString()
  }
  if (includeFields.user_agent) {
    processedReport[fieldMapping.user_agent] = '' // User agent not available in current schema
  }
  if (includeFields.viewport) {
    processedReport[fieldMapping.viewport] = '' // Viewport not available in current schema
  }

  // Enhanced diagnostic fields
  if (includeFields.console_logs) {
    processedReport[fieldMapping.console_logs] = formatDiagnosticData(report.console_logs, dataFormat)
  }
  if (includeFields.network_requests) {
    processedReport[fieldMapping.network_requests] = formatDiagnosticData(report.network_requests, dataFormat)
  }
  if (includeFields.performance_metrics) {
    processedReport[fieldMapping.performance_metrics] = formatPerformanceData(report.performance_metrics, dataFormat)
  }
  if (includeFields.interaction_data) {
    processedReport[fieldMapping.interaction_data] = formatDiagnosticData(report.interaction_data, dataFormat)
  }
  if (includeFields.error_context) {
    processedReport[fieldMapping.error_context] = formatDiagnosticData(report.error_context, dataFormat)
  }
  if (includeFields.attachments) {
    processedReport[fieldMapping.attachments] = formatAttachments(report.fl_attachments, dataFormat)
  }

  return processedReport
}

/**
 * Get enhanced field mapping based on export template
 */
function getFieldMapping(template: string) {
  const baseMapping = {
    title: 'Title',
    description: 'Description',
    type: 'Type',
    priority: 'Priority',
    reporter: 'Reporter',
    url: 'URL',
    created_at: 'Created At',
    user_agent: 'User Agent',
    viewport: 'Viewport',
    console_logs: 'Console Logs',
    network_requests: 'Network Requests',
    performance_metrics: 'Performance Metrics',
    interaction_data: 'Interaction Data',
    error_context: 'Error Context',
    attachments: 'Attachments'
  }

  switch (template) {
    case 'jira':
      return {
        ...baseMapping,
        title: 'Summary',
        type: 'Issue Type',
        created_at: 'Created',
        performance_metrics: 'Performance Data',
        error_context: 'Error Details'
      }
    case 'azure_devops':
      return {
        ...baseMapping,
        type: 'Work Item Type',
        reporter: 'Assigned To',
        created_at: 'Created Date',
        performance_metrics: 'Performance Data',
        error_context: 'Error Details'
      }
    default:
      return baseMapping
  }
}

/**
 * Format diagnostic data based on data format preference
 */
function formatDiagnosticData(data: any, dataFormat: string): string {
  if (!data) return ''

  if (dataFormat === 'structured') {
    return JSON.stringify(data, null, 2)
  } else {
    // Flattened format - create summary
    if (Array.isArray(data)) {
      return `${data.length} items`
    }
    return JSON.stringify(data)
  }
}

/**
 * Format performance data with metrics summary
 */
function formatPerformanceData(data: any, dataFormat: string): string {
  if (!data) return ''

  if (dataFormat === 'structured') {
    return JSON.stringify(data, null, 2)
  } else {
    // Flattened format - create performance summary
    const webVitals = data.web_vitals || {}
    const summary = [
      webVitals.lcp ? `LCP: ${webVitals.lcp}ms` : '',
      webVitals.fid ? `FID: ${webVitals.fid}ms` : '',
      webVitals.cls ? `CLS: ${webVitals.cls}` : '',
      webVitals.fcp ? `FCP: ${webVitals.fcp}ms` : ''
    ].filter(Boolean).join(', ')

    return summary || 'No metrics available'
  }
}

/**
 * Format viewport information
 */
function formatViewport(viewport: any): string {
  if (!viewport) return ''
  return `${viewport.width}x${viewport.height}`
}

/**
 * Format attachments information
 */
function formatAttachments(attachments: any[], dataFormat: string): string {
  if (!attachments || attachments.length === 0) return ''

  if (dataFormat === 'structured') {
    return JSON.stringify(attachments, null, 2)
  } else {
    return attachments.map(att => att.filename || 'Unnamed file').join(', ')
  }
}

/**
 * Create response with optional compression
 */
async function createResponse(
  content: string,
  contentType: string,
  filename: string,
  compress: boolean,
  isBase64: boolean = false
): Promise<NextResponse> {
  let responseContent: string | Buffer = content
  let headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${filename}"`
  }

  if (compress && !isBase64) {
    try {
      const compressed = await gzipAsync(Buffer.from(content))
      responseContent = compressed
      headers['Content-Encoding'] = 'gzip'
      headers['Content-Type'] = contentType
    } catch (error) {
      console.warn('Compression failed, serving uncompressed:', error)
    }
  }

  if (isBase64) {
    responseContent = Buffer.from(content, 'base64')
  }

  return new NextResponse(responseContent, { headers })
}

/**
 * Generate Excel file from processed reports
 */
function generateExcel(reports: any[], template: string): ArrayBuffer {
  if (reports.length === 0) {
    // Create empty workbook
    const wb = utils.book_new()
    const ws = utils.aoa_to_sheet([['No data available']])
    utils.book_append_sheet(wb, ws, 'Reports')
    return utils.write(wb, { type: 'array', bookType: 'xlsx' })
  }

  // Create workbook and worksheet
  const wb = utils.book_new()
  const ws = utils.json_to_sheet(reports)

  // Set column widths
  const colWidths = Object.keys(reports[0]).map(key => {
    const maxLength = Math.max(
      key.length,
      ...reports.map(row => String(row[key] || '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  const sheetName = template === 'default' ? 'Reports' : `Reports-${template}`
  utils.book_append_sheet(wb, ws, sheetName)

  return utils.write(wb, { type: 'array', bookType: 'xlsx' })
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