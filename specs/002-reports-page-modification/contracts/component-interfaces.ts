/**
 * Component Interface Contracts for Enhanced Reports Dashboard
 * TypeScript interfaces that define the contracts between components
 */

// ==============================================================================
// ENHANCED REPORTS TABLE COMPONENT INTERFACES
// ==============================================================================

export interface ReportsTableProps {
  projectId: string
  initialReports?: ReportTableItem[]
  onReportSelect?: (reportId: string) => void
  onExportRequest?: (selectedIds: string[]) => void
  defaultFilters?: Partial<ReportsTableFilter>
  defaultSort?: ReportsTableSort
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

// ==============================================================================
// TABLE ROW COMPONENT INTERFACES
// ==============================================================================

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

// ==============================================================================
// FILTER COMPONENT INTERFACES
// ==============================================================================

export interface ReportsTableFiltersProps {
  filter: ReportsTableFilter
  onFilterChange: (filter: ReportsTableFilter) => void
  onClearFilters: () => void
  reportCounts?: ReportCountMetadata
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

// ==============================================================================
// EXPORT COMPONENT INTERFACES
// ==============================================================================

export interface ExportPanelProps {
  isVisible: boolean
  selectedCount: number
  totalCount: number
  onExport: (config: ReportExportConfig) => void
  onCancel: () => void
  loading?: boolean
}

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
// ENHANCED REPORT DETAIL COMPONENT INTERFACES
// ==============================================================================

export interface EnhancedReportDetailProps {
  reportId: string
  projectId: string
  onBack?: () => void
  showNavigation?: boolean
}

export interface ReportDetailState {
  report: ReportWithDiagnostics | null
  loading: boolean
  error: string | null
  activeTab: 'details' | 'console_logs' | 'network_requests'
  consoleLogsExpanded: boolean
  networkRequestsExpanded: boolean
  syntaxHighlighting: boolean
}

export interface Attachment {
  id: string
  filename: string
  file_size: number
  mime_type: string
  created_at: string
}

export interface ReportWithDiagnostics extends ReportTableItem {
  console_logs: ConsoleLog[] | null
  network_requests: NetworkRequest[] | null
  attachments?: Attachment[]
  user_agent?: string | null
  updated_at: string
}

// ==============================================================================
// CONSOLE LOG VIEWER COMPONENT INTERFACES
// ==============================================================================

export interface ConsoleLogViewerProps {
  logs: ConsoleLog[]
  expanded: boolean
  onToggleExpanded: () => void
  syntaxHighlighting?: boolean
  onToggleSyntaxHighlighting?: () => void
  maxHeight?: string
}

export interface ConsoleLog {
  type: 'log' | 'warn' | 'error'
  message: string
  timestamp: string
  stack?: string
  level?: number
}

export interface LogEntryProps {
  log: ConsoleLog
  syntaxHighlighting: boolean
  onCopy: (content: string) => void
}

// ==============================================================================
// NETWORK REQUEST VIEWER COMPONENT INTERFACES
// ==============================================================================

export interface NetworkRequestViewerProps {
  requests: NetworkRequest[]
  expanded: boolean
  onToggleExpanded: () => void
  maxHeight?: string
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

export interface NetworkRequestEntryProps {
  request: NetworkRequest
  onCopy: (content: string) => void
}

// ==============================================================================
// UTILITY AND HELPER INTERFACES
// ==============================================================================

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
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
// HOOK INTERFACES
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
// VALIDATION SCHEMAS (for runtime validation)
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

// ==============================================================================
// THEME AND STYLING INTERFACES
// ==============================================================================

export interface ReportsTheme {
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
    info: string
    background: string
    surface: string
    text: string
    textSecondary: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
    }
  }
}

export interface ComponentStyleProps {
  className?: string
  style?: React.CSSProperties
  theme?: Partial<ReportsTheme>
}