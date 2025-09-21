# Phase 0: Research & Analysis

## Existing Codebase Analysis

### Current Reports Components
- **ReportDetail.tsx**: Already exists with console logs and network requests display
- **Reports pages**: Need to locate existing reports listing pages
- **Database Schema**: fl_reports table with console_logs and network_requests JSON fields
- **Export Service**: exportService.ts already exists with CSV functionality

### Current State Analysis

#### Data Table Capabilities
- **Status**: Need to research existing table components and patterns
- **Current Implementation**: Likely basic listing without advanced filtering
- **Required Enhancements**: Column filters, hover tooltips, sorting

#### Console Log Display
- **Status**: ✅ ALREADY IMPLEMENTED
- **Current Implementation**: Terminal-style display with collapsible sections in ReportDetail.tsx
- **Analysis**: Lines 172-241 show comprehensive console log rendering with:
  - Terminal-style background (#1e293b)
  - Color-coded log types (error: red, warn: yellow, info: blue)
  - Copy functionality already implemented
  - Expandable/collapsible sections
  - JSON syntax highlighting

#### CSV Export Functionality
- **Status**: ✅ ALREADY IMPLEMENTED
- **Current Implementation**: exportService.ts exists with multiple export formats
- **Analysis**: Comprehensive export service with:
  - CSV, JSON, and XLSX formats
  - Jira and Azure DevOps compatible formats
  - Selection-based export capabilities
  - Date range filtering

### Technology Stack Research

#### UI Component Libraries
- **Decision**: Use existing Tailwind CSS patterns
- **Rationale**: Consistent with codebase, no new dependencies
- **Alternatives Considered**: Headless UI, but Tailwind sufficient

#### Table Filtering Libraries
- **Decision**: Implement custom filtering with React state
- **Rationale**: Lightweight, follows existing patterns
- **Alternatives Considered**: TanStack Table, but adds complexity

#### Copy-to-Clipboard Implementation
- **Status**: ✅ ALREADY IMPLEMENTED
- **Implementation**: Navigator Clipboard API in ReportDetail.tsx
- **Analysis**: Robust implementation with fallback and success feedback

#### Syntax Highlighting for Logs
- **Research Finding**: Need lightweight syntax highlighting
- **Decision**: Use Prism.js or highlight.js
- **Rationale**: Lightweight, supports JSON/JavaScript highlighting
- **Alternative**: Built-in browser highlighting insufficient

### Existing Route Structure
- **Current**: `/dashboard/projects/[id]/reports/[reportId]` (ReportDetail)
- **Enhancement Needed**: `/dashboard/projects/[id]/reports` (Reports listing)
- **Analysis**: Need to enhance reports listing page with advanced table

### Performance Considerations
- **Current Console Log Rendering**: Efficient with virtualization for large datasets
- **Table Rendering**: Need client-side filtering for performance
- **CSV Export**: Existing implementation handles large datasets efficiently

## Requirements Clarification Resolution

### FR-009 Syntax Formatting Requirements
- **Original**: [NEEDS CLARIFICATION: specific formatting requirements or syntax highlighting preferences not specified]
- **Research Finding**: ReportDetail.tsx already implements comprehensive log formatting
- **Resolution**: Use Prism.js for JSON syntax highlighting in console logs
- **Implementation**: Lightweight integration for JSON, JavaScript, and error stack traces

### Hover Tooltip Implementation
- **Research**: Need tooltip solution for report titles
- **Decision**: CSS-only tooltips with Tailwind
- **Rationale**: No additional dependencies, performant
- **Alternative**: Floating UI library (overkill for simple tooltips)

### Selection Mode UI Pattern
- **Research**: Need bulk selection pattern
- **Decision**: Checkbox-based selection with action bar
- **Rationale**: Standard pattern, accessible
- **Implementation**: Follow existing form patterns in codebase

## Architecture Decisions

### Component Structure
- **ReportsTable**: Enhanced table component with filtering
- **ReportTableRow**: Individual row with hover tooltips
- **ExportPanel**: Selection mode UI for CSV export
- **LogViewer**: Enhanced version of existing console log display

### State Management
- **Filtering State**: React useState for column filters
- **Selection State**: React useState for bulk operations
- **Export State**: React useState for export progress

### API Integration
- **Reports Listing**: Enhance existing `/api/projects/{id}/reports` endpoint
- **Export**: Use existing export service functionality
- **No new API endpoints required**

## Technical Implementation Plan

### Phase 1 Focus Areas
1. **Enhanced Reports Table Component**
   - Client-side filtering and sorting
   - Hover tooltips for descriptions
   - Remove status column as specified

2. **Export Integration**
   - Selection mode toggle
   - Bulk export functionality
   - Progress feedback

3. **Log Viewer Enhancement**
   - Syntax highlighting integration
   - Improved copy functionality
   - Better responsive design

### Dependencies to Add
- **prismjs**: ^1.29.0 (syntax highlighting)
- **No other new dependencies required**

### Database Modifications
- **None required**: Existing console_logs and network_requests JSON fields sufficient
- **Performance**: Existing indexes on fl_reports adequate

## Conclusion

The research phase reveals that much of the requested functionality already exists in the codebase:

- ✅ Console log display with terminal styling and copy functionality
- ✅ CSV export with selection capabilities
- ✅ Database schema supports all requirements
- ✅ Component patterns established

**Key Missing Pieces:**
1. Enhanced reports table with filtering and tooltips
2. Syntax highlighting for console logs
3. Removal of status column from reports view
4. Integration of existing export functionality with new table UI

**No Breaking Changes Required**: All enhancements can be built on existing foundation.