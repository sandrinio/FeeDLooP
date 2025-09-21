/**
 * Report Service Layer with Filtering and Status Management
 * T085: Report service layer with filtering and status management in lib/services/reportService.ts
 */

import { supabaseAdmin, handleDatabaseError, measureQuery, DatabaseError } from '@/lib/database/supabase'

// Simplified report types based on actual database schema
export interface CreateReportInput {
  title: string
  description: string
  type: 'bug' | 'initiative' | 'feedback'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  reporter_email?: string
  reporter_name?: string
  url?: string
  user_agent?: string
  console_logs?: any
  network_requests?: any
}

export interface UpdateReportInput {
  title?: string
  description?: string
  status?: 'active' | 'archived'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  type?: 'bug' | 'initiative' | 'feedback'
}

export interface Report {
  id: string
  project_id: string
  title: string
  description: string
  type: 'bug' | 'initiative' | 'feedback'
  status: 'active' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical' | null
  reporter_email: string | null
  reporter_name: string | null
  url: string | null
  user_agent: string | null
  console_logs: any | null
  network_requests: any | null
  created_at: Date
  updated_at: Date
}

export interface ReportWithAttachments extends Report {
  fl_attachments: Attachment[]
}

export interface Attachment {
  id: string
  filename: string
  file_size: number
  mime_type: string
  created_at: Date
}

export interface ReportFilters {
  type?: 'bug' | 'initiative' | 'feedback'
  status?: 'active' | 'archived'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  page?: number
  limit?: number
  search?: string
}

export interface ReportListResponse {
  reports: Report[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  filters: ReportFilters
}

export interface ReportStats {
  total: number
  byType: {
    bug: number
    initiative: number
    feedback: number
  }
  byStatus: {
    active: number
    archived: number
  }
  byPriority: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

export class ReportService {
  private static instance: ReportService

  private constructor() {}

  public static getInstance(): ReportService {
    if (!ReportService.instance) {
      ReportService.instance = new ReportService()
    }
    return ReportService.instance
  }

  /**
   * Create a new report
   */
  async createReport(projectId: string, reportData: CreateReportInput): Promise<Report> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Validate input
      if (!reportData.title || reportData.title.trim().length === 0) {
        throw new DatabaseError('Report title is required', 'VALIDATION_ERROR')
      }

      if (!reportData.description || reportData.description.trim().length === 0) {
        throw new DatabaseError('Report description is required', 'VALIDATION_ERROR')
      }

      if (!['bug', 'initiative', 'feedback'].includes(reportData.type)) {
        throw new DatabaseError('Invalid report type', 'VALIDATION_ERROR')
      }

      // Create report in database
      const { data: report, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .insert({
            project_id: projectId,
            title: reportData.title.trim(),
            description: reportData.description.trim(),
            type: reportData.type,
            status: 'active',
            priority: reportData.priority || 'medium',
            reporter_email: reportData.reporter_email || null,
            reporter_name: reportData.reporter_name || null,
            url: reportData.url || null,
            user_agent: reportData.user_agent || null,
            console_logs: reportData.console_logs || null,
            network_requests: reportData.network_requests || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single(),
        'createReport'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return this.mapDatabaseToReport(report)

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to create report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId: string, includeAttachments = false): Promise<ReportWithAttachments | null> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const selectQuery = includeAttachments
        ? `
          *,
          fl_attachments(
            id,
            filename,
            file_size,
            mime_type,
            created_at
          )
        `
        : '*'

      const { data: report, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select(selectQuery)
          .eq('id', reportId)
          .single(),
        'getReportById'
      )

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Report not found
        }
        handleDatabaseError(error)
      }

      const mappedReport = this.mapDatabaseToReport(report)

      return {
        ...mappedReport,
        fl_attachments: includeAttachments ? (report.fl_attachments || []) : []
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get reports for a project with filtering and pagination
   */
  async getProjectReports(projectId: string, filters: ReportFilters = {}): Promise<ReportListResponse> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const page = filters.page || 1
      const limit = Math.min(filters.limit || 50, 100)
      const offset = (page - 1) * limit

      // Build query with filters
      let query = supabaseAdmin
        .from('fl_reports')
        .select(`
          id,
          project_id,
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
          updated_at
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

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

      if (filters.search) {
        const searchTerm = `%${filters.search}%`
        query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      }

      const { data: reports, error: reportsError } = await measureQuery(
        () => query,
        'getProjectReports'
      )

      if (reportsError) {
        handleDatabaseError(reportsError)
      }

      // Get total count for pagination
      let countQuery = supabaseAdmin
        .from('fl_reports')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)

      // Apply same filters to count query
      if (filters.type) {
        countQuery = countQuery.eq('type', filters.type)
      }

      if (filters.status) {
        countQuery = countQuery.eq('status', filters.status)
      }

      if (filters.priority) {
        countQuery = countQuery.eq('priority', filters.priority)
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`
        countQuery = countQuery.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      }

      const { count, error: countError } = await measureQuery(
        () => countQuery,
        'getProjectReportsCount'
      )

      if (countError) {
        console.error('Error counting reports:', countError)
      }

      return {
        reports: (reports || []).map(report => this.mapDatabaseToReport(report)),
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        },
        filters
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get project reports: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update report
   */
  async updateReport(reportId: string, updateData: UpdateReportInput): Promise<Report> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Check if report exists
      const existingReport = await this.getReportById(reportId)
      if (!existingReport) {
        throw new DatabaseError('Report not found', 'REPORT_NOT_FOUND')
      }

      // Validate input
      if (updateData.title !== undefined && updateData.title.trim().length === 0) {
        throw new DatabaseError('Report title cannot be empty', 'VALIDATION_ERROR')
      }

      if (updateData.description !== undefined && updateData.description.trim().length === 0) {
        throw new DatabaseError('Report description cannot be empty', 'VALIDATION_ERROR')
      }

      const updatePayload: any = {
        updated_at: new Date().toISOString()
      }

      if (updateData.title !== undefined) {
        updatePayload.title = updateData.title.trim()
      }

      if (updateData.description !== undefined) {
        updatePayload.description = updateData.description.trim()
      }

      if (updateData.status !== undefined) {
        updatePayload.status = updateData.status
      }

      if (updateData.priority !== undefined) {
        updatePayload.priority = updateData.priority
      }

      if (updateData.type !== undefined) {
        updatePayload.type = updateData.type
      }

      const { data: report, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .update(updatePayload)
          .eq('id', reportId)
          .select()
          .single(),
        'updateReport'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return this.mapDatabaseToReport(report)

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to update report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete report
   */
  async deleteReport(reportId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Check if report exists
      const existingReport = await this.getReportById(reportId)
      if (!existingReport) {
        throw new DatabaseError('Report not found', 'REPORT_NOT_FOUND')
      }

      // Delete report (cascade delete will handle attachments)
      const { error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .delete()
          .eq('id', reportId),
        'deleteReport'
      )

      if (error) {
        handleDatabaseError(error)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to delete report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update report status
   */
  async updateReportStatus(reportId: string, status: 'active' | 'archived'): Promise<Report> {
    return this.updateReport(reportId, { status })
  }

  /**
   * Update report priority
   */
  async updateReportPriority(reportId: string, priority: 'low' | 'medium' | 'high' | 'critical'): Promise<Report> {
    return this.updateReport(reportId, { priority })
  }

  /**
   * Bulk update reports
   */
  async bulkUpdateReports(reportIds: string[], updateData: UpdateReportInput): Promise<number> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      if (reportIds.length === 0) {
        return 0
      }

      if (reportIds.length > 100) {
        throw new DatabaseError('Cannot update more than 100 reports at once', 'VALIDATION_ERROR')
      }

      const updatePayload: any = {
        updated_at: new Date().toISOString()
      }

      if (updateData.status !== undefined) {
        updatePayload.status = updateData.status
      }

      if (updateData.priority !== undefined) {
        updatePayload.priority = updateData.priority
      }

      if (updateData.type !== undefined) {
        updatePayload.type = updateData.type
      }

      const { error, count } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .update(updatePayload)
          .in('id', reportIds),
        'bulkUpdateReports'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return count || 0

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to bulk update reports: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get report statistics for a project
   */
  async getProjectReportStats(projectId: string): Promise<ReportStats> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Get total count
      const { count: total, error: totalError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId),
        'getReportStatsTotal'
      )

      if (totalError) {
        handleDatabaseError(totalError)
      }

      // Get counts by type
      const { data: typeStats, error: typeError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('type')
          .eq('project_id', projectId),
        'getReportStatsByType'
      )

      if (typeError) {
        handleDatabaseError(typeError)
      }

      // Get counts by status
      const { data: statusStats, error: statusError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('status')
          .eq('project_id', projectId),
        'getReportStatsByStatus'
      )

      if (statusError) {
        handleDatabaseError(statusError)
      }

      // Get counts by priority
      const { data: priorityStats, error: priorityError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('priority')
          .eq('project_id', projectId),
        'getReportStatsByPriority'
      )

      if (priorityError) {
        handleDatabaseError(priorityError)
      }

      // Calculate statistics
      const byType = {
        bug: (typeStats || []).filter(r => r.type === 'bug').length,
        initiative: (typeStats || []).filter(r => r.type === 'initiative').length,
        feedback: (typeStats || []).filter(r => r.type === 'feedback').length
      }

      const byStatus = {
        active: (statusStats || []).filter(r => r.status === 'active').length,
        archived: (statusStats || []).filter(r => r.status === 'archived').length
      }

      const byPriority = {
        low: (priorityStats || []).filter(r => r.priority === 'low').length,
        medium: (priorityStats || []).filter(r => r.priority === 'medium').length,
        high: (priorityStats || []).filter(r => r.priority === 'high').length,
        critical: (priorityStats || []).filter(r => r.priority === 'critical').length
      }

      return {
        total: total || 0,
        byType,
        byStatus,
        byPriority
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get report stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search reports across projects (for users with access)
   */
  async searchReports(searchTerm: string, projectIds: string[], limit = 20): Promise<Report[]> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return []
      }

      if (projectIds.length === 0) {
        return []
      }

      const searchQuery = `%${searchTerm.trim()}%`

      const { data: reports, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('*')
          .in('project_id', projectIds)
          .or(`title.ilike.${searchQuery},description.ilike.${searchQuery}`)
          .order('created_at', { ascending: false })
          .limit(limit),
        'searchReports'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return (reports || []).map(report => this.mapDatabaseToReport(report))

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to search reports: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get recent reports for a user's projects
   */
  async getRecentReports(projectIds: string[], limit = 10): Promise<Report[]> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      if (projectIds.length === 0) {
        return []
      }

      const { data: reports, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(limit),
        'getRecentReports'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return (reports || []).map(report => this.mapDatabaseToReport(report))

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get recent reports: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Archive multiple reports
   */
  async archiveReports(reportIds: string[]): Promise<number> {
    return this.bulkUpdateReports(reportIds, { status: 'archived' })
  }

  /**
   * Restore archived reports
   */
  async restoreReports(reportIds: string[]): Promise<number> {
    return this.bulkUpdateReports(reportIds, { status: 'active' })
  }

  /**
   * Get reports by integration key (for widget submissions)
   */
  async getReportsByIntegrationKey(integrationKey: string, limit = 50): Promise<Report[]> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // First get the project ID from integration key
      const { data: project, error: projectError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_projects')
          .select('id')
          .eq('integration_key', integrationKey)
          .single(),
        'getProjectByIntegrationKey'
      )

      if (projectError || !project) {
        throw new DatabaseError('Invalid integration key', 'INVALID_INTEGRATION_KEY')
      }

      return this.getRecentReports([project.id], limit)

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get reports by integration key: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Map database row to Report object
   */
  private mapDatabaseToReport(dbReport: any): Report {
    return {
      id: dbReport.id,
      project_id: dbReport.project_id,
      title: dbReport.title,
      description: dbReport.description,
      type: dbReport.type,
      status: dbReport.status,
      priority: dbReport.priority,
      reporter_email: dbReport.reporter_email,
      reporter_name: dbReport.reporter_name,
      url: dbReport.url,
      user_agent: dbReport.user_agent,
      console_logs: dbReport.console_logs,
      network_requests: dbReport.network_requests,
      created_at: new Date(dbReport.created_at),
      updated_at: new Date(dbReport.updated_at)
    }
  }
}

// Export singleton instance
export const reportService = ReportService.getInstance()