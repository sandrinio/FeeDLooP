# Data Model - Enhanced Reports Dashboard

## Existing Entities (No Schema Changes Required)

### Report Entity (fl_reports table)
**Status**: ✅ Existing schema supports all requirements

```typescript
interface Report {
  id: string                          // UUID primary key
  project_id: string                  // UUID foreign key to fl_projects
  type: 'bug' | 'initiative' | 'feedback'
  title: string                       // 1-200 characters (used for hover tooltips)
  description: string                 // 1-5000 characters (displayed in hover)
  status: 'active' | 'archived'      // NOTE: Will be hidden from UI per requirements
  priority: 'low' | 'medium' | 'high' | 'critical' | null
  reporter_email: string | null
  reporter_name: string | null
  url: string | null                  // Page URL where report was submitted
  user_agent: string | null
  console_logs: ConsoleLog[] | null   // JSON field - already formatted for display
  network_requests: NetworkRequest[] | null // JSON field - already formatted for display
  created_at: string                  // ISO timestamp (submission date)
  updated_at: string                  // ISO timestamp
}
```

### Console Log Structure (Existing JSON Schema)
```typescript
interface ConsoleLog {
  type: 'log' | 'warn' | 'error'
  message: string
  timestamp: string                   // ISO timestamp
  stack?: string                      // Error stack trace (if available)
  level?: number                      // Log level (if applicable)
}
```

### Network Request Structure (Existing JSON Schema)
```typescript
interface NetworkRequest {
  url: string
  method: string                      // GET, POST, PUT, DELETE, etc.
  status: number                      // HTTP status code
  duration: number                    // Request duration in milliseconds
  timestamp: string                   // ISO timestamp
  size?: number                       // Response size in bytes
  headers?: Record<string, string>    // Request/response headers
}
```

## New UI State Models

### Table Filter State
```typescript
interface ReportsTableFilter {
  title: string                       // Text search in title
  type: 'bug' | 'initiative' | 'feedback' | 'all'
  priority: 'low' | 'medium' | 'high' | 'critical' | 'all'
  dateRange: {
    from: Date | null
    to: Date | null
  }
  reporter: string                    // Search in reporter_name or reporter_email
}
```

### Table Sort State
```typescript
interface ReportsTableSort {
  column: 'title' | 'type' | 'priority' | 'created_at' | 'reporter_name'
  direction: 'asc' | 'desc'
}
```

### Selection State for Export
```typescript
interface ReportsTableSelection {
  selectedReports: Set<string>        // Set of report IDs
  selectAll: boolean                  // Select all filtered reports
  exportMode: boolean                 // Whether in export selection mode
}
```

### Export Configuration
```typescript
interface ReportExportConfig {
  format: 'csv' | 'json' | 'xlsx'
  includeFields: {
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
  dateRange?: {
    from: Date
    to: Date
  }
}
```

## Component State Models

### ReportsTable Component State
```typescript
interface ReportsTableState {
  reports: Report[]
  filteredReports: Report[]
  filter: ReportsTableFilter
  sort: ReportsTableSort
  selection: ReportsTableSelection
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
  }
}
```

### Enhanced ReportDetail State
```typescript
interface ReportDetailState {
  report: Report | null
  loading: boolean
  error: string | null
  activeTab: 'details' | 'console_logs' | 'network_requests'
  consoleLogsExpanded: boolean
  networkRequestsExpanded: boolean
  syntaxHighlighting: boolean
}
```

## Validation Rules (Existing)

### Report Table Display Rules
- **Title Column**:
  - Display: Truncated to 50 characters with "..." if longer
  - Hover: Full title and description in tooltip
  - Click: Navigate to detail view

- **URL Column**:
  - Display: Domain only (e.g., "app.example.com")
  - Hover: Full URL in tooltip

- **Priority Column**:
  - Display: Badge with color coding
  - Null values: Display as "Not Set"

- **Created Date Column**:
  - Display: Relative time (e.g., "2 hours ago", "3 days ago")
  - Hover: Full ISO timestamp

### Filter Validation
- **Date Range**: From date cannot be after To date
- **Text Filters**: Minimum 2 characters for search
- **Type/Priority**: Must match enum values

### Export Validation
- **Selection**: Minimum 1 report must be selected
- **File Size**: Maximum 1000 reports per export
- **Format**: Must be supported format (csv, json, xlsx)

## Relationships (Unchanged)

### Report → Project
- **Type**: Many-to-One
- **Foreign Key**: report.project_id → project.id
- **RLS Policy**: Users can only see reports from projects they have access to

### Report → Attachments (Existing, Not Modified)
- **Type**: One-to-Many
- **Foreign Key**: attachment.report_id → report.id
- **Display**: Count in table, full list in detail view

## State Transitions

### Export Mode Workflow
1. **Normal Mode** → **Export Mode**: User clicks export icon
2. **Export Mode**: All reports pre-selected by default
3. **Selection Changes**: User can toggle individual reports
4. **Export Execution**: Generate CSV with selected reports
5. **Export Mode** → **Normal Mode**: After export completion or cancel

### Filter Application Sequence
1. **Text Filters Applied**: Title, reporter search
2. **Enum Filters Applied**: Type, priority selection
3. **Date Range Applied**: Creation date filtering
4. **Sort Applied**: To filtered results
5. **Pagination Applied**: To sorted, filtered results

## Performance Considerations

### Indexing (Existing, Adequate)
- **fl_reports.project_id**: Index exists for RLS performance
- **fl_reports.created_at**: Index exists for date sorting
- **fl_reports.type**: Index exists for type filtering

### Client-Side Optimization
- **Virtual Scrolling**: For tables with >100 rows
- **Debounced Search**: 300ms delay for text filters
- **Memoized Filtering**: React.useMemo for filter operations
- **Lazy Loading**: Console logs/network requests on expand

### Data Fetching Strategy
- **Initial Load**: Basic report data only (no console_logs/network_requests)
- **Detail View**: Full data including diagnostic information
- **Pagination**: Server-side for large datasets
- **Filtering**: Client-side for loaded data, server-side for new data

## No Breaking Changes

All enhancements build on existing data structures:
- ✅ No database schema modifications required
- ✅ No changes to existing API contracts
- ✅ No modifications to widget submission format
- ✅ Backwards compatible with all existing functionality