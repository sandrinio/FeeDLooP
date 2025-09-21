/**
 * Export Service for CSV Generation
 * T087: Export service for CSV generation
 */

import { supabaseAdmin, handleDatabaseError, measureQuery, DatabaseError } from '@/lib/database/supabase'
import { z } from 'zod'

// Types for export operations
export interface ExportFilter {
  type?: 'bug' | 'initiative' | 'feedback'
  status?: 'active' | 'archived'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  from?: Date
  to?: Date
}

export interface ExportOptions {
  format: 'csv'
  template: 'default' | 'jira' | 'azure'
  include_attachments: boolean
  include_diagnostic: boolean
}

export interface ExportResult {
  filename: string
  content: string
  contentType: string
  size: number
  recordCount: number
}

// Validation schemas
const ExportFilterSchema = z.object({
  type: z.enum(['bug', 'initiative', 'feedback']).optional(),
  status: z.enum(['active', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  from: z.date().optional(),
  to: z.date().optional()
})

const ExportOptionsSchema = z.object({
  format: z.enum(['csv']).default('csv'),
  template: z.enum(['default', 'jira', 'azure']).default('default'),
  include_attachments: z.boolean().default(false),
  include_diagnostic: z.boolean().default(false)
})

export class ExportService {
  private static instance: ExportService

  private constructor() {}

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService()
    }
    return ExportService.instance
  }

  /**
   * Export project reports as CSV
   */
  async exportProjectReports(
    projectId: string,
    filters: ExportFilter = {},
    options: ExportOptions = {
      format: 'csv',
      template: 'default',
      include_attachments: false,
      include_diagnostic: false
    }
  ): Promise<ExportResult> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Validate inputs
      const validatedFilters = ExportFilterSchema.parse(filters)
      const validatedOptions = ExportOptionsSchema.parse(options)

      // Fetch reports
      const reports = await this.fetchReports(projectId, validatedFilters)

      // Generate CSV content
      const csvContent = this.generateCSV(reports, validatedOptions)

      // Generate filename
      const filename = this.generateFilename(projectId, validatedOptions.template)

      return {
        filename,
        content: csvContent,
        contentType: 'text/csv',
        size: Buffer.byteLength(csvContent, 'utf8'),
        recordCount: reports.length
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new DatabaseError(
          `Validation failed: ${error.errors.map(e => e.message).join(', ')}`,
          'VALIDATION_ERROR'
        )
      }
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to export reports: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Export reports by IDs
   */
  async exportReportsByIds(
    reportIds: string[],
    options: ExportOptions = {
      format: 'csv',
      template: 'default',
      include_attachments: false,
      include_diagnostic: false
    }
  ): Promise<ExportResult> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Validate options
      const validatedOptions = ExportOptionsSchema.parse(options)

      // Fetch specific reports
      const reports = await this.fetchReportsByIds(reportIds)

      // Generate CSV content
      const csvContent = this.generateCSV(reports, validatedOptions)

      // Generate filename
      const filename = this.generateFilename('custom', validatedOptions.template)

      return {
        filename,
        content: csvContent,
        contentType: 'text/csv',
        size: Buffer.byteLength(csvContent, 'utf8'),
        recordCount: reports.length
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new DatabaseError(
          `Validation failed: ${error.errors.map(e => e.message).join(', ')}`,
          'VALIDATION_ERROR'
        )
      }
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to export reports: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get export statistics for a project
   */
  async getExportStats(projectId: string, filters: ExportFilter = {}): Promise<{
    totalReports: number
    reportsByType: Record<string, number>
    reportsByStatus: Record<string, number>
    reportsByPriority: Record<string, number>
    dateRange: { earliest: Date | null; latest: Date | null }
  }> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const validatedFilters = ExportFilterSchema.parse(filters)

      // Build base query for counting
      let query = supabaseAdmin
        .from('fl_reports')
        .select('type, status, priority, created_at')
        .eq('project_id', projectId)

      // Apply filters
      if (validatedFilters.type) {
        query = query.eq('type', validatedFilters.type)
      }
      if (validatedFilters.status) {
        query = query.eq('status', validatedFilters.status)
      }
      if (validatedFilters.priority) {
        query = query.eq('priority', validatedFilters.priority)
      }
      if (validatedFilters.from) {
        query = query.gte('created_at', validatedFilters.from.toISOString())
      }
      if (validatedFilters.to) {
        query = query.lte('created_at', validatedFilters.to.toISOString())
      }

      const { data: reports, error } = await measureQuery(
        () => query,
        'getExportStats'
      )

      if (error) {
        handleDatabaseError(error)
      }

      const reportData = reports || []

      // Calculate statistics
      const reportsByType: Record<string, number> = {}
      const reportsByStatus: Record<string, number> = {}
      const reportsByPriority: Record<string, number> = {}
      let earliest: Date | null = null
      let latest: Date | null = null

      reportData.forEach((report: any) => {
        // Count by type
        reportsByType[report.type] = (reportsByType[report.type] || 0) + 1

        // Count by status
        reportsByStatus[report.status] = (reportsByStatus[report.status] || 0) + 1

        // Count by priority
        if (report.priority) {
          reportsByPriority[report.priority] = (reportsByPriority[report.priority] || 0) + 1
        }

        // Track date range
        const createdAt = new Date(report.created_at)
        if (!earliest || createdAt < earliest) {
          earliest = createdAt
        }
        if (!latest || createdAt > latest) {
          latest = createdAt
        }
      })

      return {
        totalReports: reportData.length,
        reportsByType,
        reportsByStatus,
        reportsByPriority,
        dateRange: { earliest, latest }
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get export stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Private helper methods
   */
  private async fetchReports(projectId: string, filters: ExportFilter): Promise<any[]> {
    // Build query
    let query = supabaseAdmin!
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
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters.from) {
      query = query.gte('created_at', filters.from.toISOString())
    }
    if (filters.to) {
      query = query.lte('created_at', filters.to.toISOString())
    }

    const { data: reports, error } = await measureQuery(
      () => query,
      'fetchReports'
    )

    if (error) {
      handleDatabaseError(error)
    }

    return reports || []
  }

  private async fetchReportsByIds(reportIds: string[]): Promise<any[]> {
    const { data: reports, error } = await measureQuery(
      () => supabaseAdmin!
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
        .in('id', reportIds)
        .order('created_at', { ascending: false }),
      'fetchReportsByIds'
    )

    if (error) {
      handleDatabaseError(error)
    }

    return reports || []
  }

  private generateCSV(reports: any[], options: ExportOptions): string {
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
            this.escapeCSVField(this.mapTypeToJira(report.type)),
            this.escapeCSVField(report.title),
            this.escapeCSVField(report.description),
            this.escapeCSVField(this.capitalizeFirst(report.priority || '')),
            this.escapeCSVField(this.mapStatusToJira(report.status)),
            this.escapeCSVField(report.reporter_name || report.reporter_email || '')
          )
          break

        case 'azure':
          row.push(
            this.escapeCSVField(this.mapTypeToAzure(report.type)),
            this.escapeCSVField(report.title),
            this.escapeCSVField(report.description),
            this.escapeCSVField(this.mapStatusToAzure(report.status)),
            this.escapeCSVField(this.capitalizeFirst(report.priority || '')),
            this.escapeCSVField(report.reporter_name || report.reporter_email || '')
          )
          break

        default: // 'default'
          row.push(
            this.escapeCSVField(report.id),
            this.escapeCSVField(this.capitalizeFirst(report.type)),
            this.escapeCSVField(report.title),
            this.escapeCSVField(report.description),
            this.escapeCSVField(this.capitalizeFirst(report.status)),
            this.escapeCSVField(this.capitalizeFirst(report.priority || '')),
            this.escapeCSVField(new Date(report.created_at).toLocaleString()),
            this.escapeCSVField(report.reporter_name || ''),
            this.escapeCSVField(report.reporter_email || '')
          )
          break
      }

      // Add attachments if requested
      if (include_attachments) {
        const attachments = report.fl_attachments || []
        const attachmentNames = attachments.map((att: any) => att.filename).join('; ')
        row.push(this.escapeCSVField(attachmentNames))
      }

      // Add diagnostic data if requested
      if (include_diagnostic) {
        const userAgent = report.user_agent || ''
        const browser = this.extractBrowser(userAgent)
        const os = this.extractOS(userAgent)
        const pageUrl = report.url || ''
        const consoleErrors = report.console_logs ?
          JSON.stringify(report.console_logs).slice(0, 100) + '...' : ''

        row.push(
          this.escapeCSVField(browser),
          this.escapeCSVField(os),
          this.escapeCSVField(pageUrl),
          this.escapeCSVField(consoleErrors)
        )
      }

      rows.push(row.join(','))
    }

    return rows.join('\n')
  }

  private generateFilename(projectId: string, template: string): string {
    const dateStr = new Date().toISOString().split('T')[0]
    const templateSuffix = template !== 'default' ? `-${template}` : ''
    return `feedloop-export-${projectId}${templateSuffix}-${dateStr}.csv`
  }

  // CSV utility methods
  private escapeCSVField(field: string): string {
    if (!field) return ''

    const stringField = String(field)

    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`
    }

    return stringField
  }

  // Template mapping methods
  private mapTypeToJira(type: string): string {
    switch (type) {
      case 'bug': return 'Bug'
      case 'initiative': return 'Story'
      case 'feedback': return 'Task'
      default: return 'Task'
    }
  }

  private mapTypeToAzure(type: string): string {
    switch (type) {
      case 'bug': return 'Bug'
      case 'initiative': return 'Feature'
      case 'feedback': return 'Task'
      default: return 'Task'
    }
  }

  private mapStatusToJira(status: string): string {
    switch (status) {
      case 'active': return 'To Do'
      case 'archived': return 'Done'
      default: return 'To Do'
    }
  }

  private mapStatusToAzure(status: string): string {
    switch (status) {
      case 'active': return 'New'
      case 'archived': return 'Closed'
      default: return 'New'
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // User agent parsing methods
  private extractBrowser(userAgent: string): string {
    if (!userAgent) return ''

    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'

    return 'Unknown'
  }

  private extractOS(userAgent: string): string {
    if (!userAgent) return ''

    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac OS')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS')) return 'iOS'

    return 'Unknown'
  }
}

// Export singleton instance
export const exportService = ExportService.getInstance()