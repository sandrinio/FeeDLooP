/**
 * TypeScript interfaces for Enhanced Reports Dashboard
 * Based on contracts from specs/002-reports-page-modification/contracts
 */

// ==============================================================================
// REPORT DATA MODELS
// ==============================================================================

export interface Report {
  id: string
  project_id: string
  type: 'bug' | 'initiative' | 'feedback'
  title: string
  description: string
  status: 'active' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical' | null
  reporter_email: string | null
  reporter_name: string | null
  url: string | null
  user_agent: string | null
  console_logs: ConsoleLog[] | null
  network_requests: NetworkRequest[] | null
  created_at: string
  updated_at: string
}

export interface ReportTableItem {
  id: string
  project_id: string
  title: string
  description: string
  type: 'bug' | 'initiative' | 'feedback'
  priority: 'low' | 'medium' | 'high' | 'critical' | null
  url: string | null
  reporter_name: string | null
  reporter_email: string | null
  created_at: string
  // Metadata for table display
  console_logs_count?: number
  network_requests_count?: number
  attachments_count?: number
}

export interface ConsoleLog {
  type: 'log' | 'warn' | 'error'
  message: string
  timestamp: string
  stack?: string
  level?: number
}

export interface NetworkRequest {
  url: string
  method: string
  status: number
  duration: number
  timestamp: string
  size?: number
  headers?: Record<string, string>
}

// ==============================================================================
// TABLE STATE INTERFACES
// ==============================================================================

export interface ReportsTableFilter {
  title: string
  type: 'bug' | 'initiative' | 'feedback' | 'all'
  priority: 'low' | 'medium' | 'high' | 'critical' | 'all'
  reporter: string
  dateRange: {
    from: Date | null
    to: Date | null
  }
}

export interface ReportsTableSort {
  column: 'title' | 'type' | 'priority' | 'created_at' | 'reporter_name'
  direction: 'asc' | 'desc'
}

export interface ReportsTableSelection {
  selectedReports: Set<string>
  selectAll: boolean
  exportMode: boolean
}

export interface ReportsTableState {
  reports: ReportTableItem[]
  filteredReports: ReportTableItem[]
  filter: ReportsTableFilter
  sort: ReportsTableSort
  selection: ReportsTableSelection
  loading: boolean
  error: string | null
  pagination: PaginationInfo
}

// ==============================================================================
// EXPORT INTERFACES
// ==============================================================================

export interface ReportExportConfig {
  format: 'csv' | 'json' | 'xlsx'
  report_ids?: string[]
  filters?: Partial<ReportsTableFilter>
  include_fields: {
    title: boolean
    description: boolean
    type: boolean
    priority: boolean
    reporter: boolean
    url: boolean
    created_at: boolean
    console_logs: boolean
    network_requests: boolean
  }
  template: 'default' | 'jira' | 'azure_devops'
}

export interface ExportProgress {
  status: 'idle' | 'exporting' | 'success' | 'error'
  progress: number
  message: string
  downloadUrl?: string
}

// ==============================================================================
// API RESPONSE INTERFACES
// ==============================================================================

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface ReportCountMetadata {
  total_by_type: {
    bug: number
    initiative: number
    feedback: number
  }
  total_by_priority: {
    low: number
    medium: number
    high: number
    critical: number
    null: number
  }
}

export interface ApiResponse<T> {
  data: T
  pagination?: PaginationInfo
  metadata?: ReportCountMetadata
  message?: string
}

export interface ApiError {
  error: string
  message: string
  details?: Array<{
    field: string
    message: string
  }>
}

// ==============================================================================
// COMPONENT PROP INTERFACES
// ==============================================================================

export interface ReportsTableProps {
  projectId: string
  initialReports?: ReportTableItem[]
  onReportSelect?: (reportId: string) => void
  onExportRequest?: (selectedIds: string[]) => void
  defaultFilters?: Partial<ReportsTableFilter>
  defaultSort?: ReportsTableSort
}

export interface ReportTableRowProps {
  report: ReportTableItem
  isSelected: boolean
  isExportMode: boolean
  onSelect: (reportId: string, selected: boolean) => void
  onClick: (reportId: string) => void
  onTitleHover?: (report: ReportTableItem) => void
}

export interface ReportTooltipProps {
  title: string
  description: string
  position: { x: number; y: number }
  visible: boolean
}

export interface ReportsTableFiltersProps {
  filter: ReportsTableFilter
  onFilterChange: (filter: ReportsTableFilter) => void
  onClearFilters: () => void
  reportCounts?: ReportCountMetadata
}

export interface ExportPanelProps {
  isVisible: boolean
  selectedCount: number
  totalCount: number
  onExport: (config: ReportExportConfig) => void
  onCancel: () => void
  loading?: boolean
}

export interface ConsoleLogViewerProps {
  logs: ConsoleLog[]
  expanded: boolean
  onToggleExpanded: () => void
  syntaxHighlighting?: boolean
  onToggleSyntaxHighlighting?: () => void
  maxHeight?: string
}

export interface NetworkRequestViewerProps {
  requests: NetworkRequest[]
  expanded: boolean
  onToggleExpanded: () => void
  maxHeight?: string
}

// ==============================================================================
// HOOK RETURN INTERFACES
// ==============================================================================

export interface UseReportsTableReturn {
  reports: ReportTableItem[]
  loading: boolean
  error: string | null
  filter: ReportsTableFilter
  sort: ReportsTableSort
  selection: ReportsTableSelection
  pagination: PaginationInfo
  metadata: ReportCountMetadata | null
  // Actions
  setFilter: (filter: ReportsTableFilter) => void
  setSort: (sort: ReportsTableSort) => void
  setSelection: (selection: ReportsTableSelection) => void
  toggleReportSelection: (reportId: string) => void
  toggleSelectAll: () => void
  toggleExportMode: () => void
  clearSelection: () => void
  refreshReports: () => Promise<void>
}

export interface UseReportExportReturn {
  exportProgress: ExportProgress
  exportReports: (config: ReportExportConfig) => Promise<void>
  resetExport: () => void
}

export interface UseCopyToClipboardReturn {
  copy: (text: string) => Promise<boolean>
  isSupported: boolean
  copyStatus: 'idle' | 'copying' | 'success' | 'error'
}

// ==============================================================================
// VALIDATION SCHEMAS
// ==============================================================================

export interface ReportsTableValidation {
  validateFilter: (filter: Partial<ReportsTableFilter>) => string[]
  validateSort: (sort: Partial<ReportsTableSort>) => string[]
  validateExportConfig: (config: Partial<ReportExportConfig>) => string[]
  validateReportIds: (ids: string[]) => string[]
}

// ==============================================================================
// ACCESSIBILITY INTERFACES
// ==============================================================================

export interface A11yProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-selected'?: boolean
  role?: string
  tabIndex?: number
}

export interface KeyboardNavigationProps {
  onKeyDown?: (event: React.KeyboardEvent) => void
  onFocus?: () => void
  onBlur?: () => void
}