# Tasks: Enhanced Reports Dashboard with Advanced Data Table and Developer-Friendly Log Viewer

**Input**: Design documents from `/specs/002-reports-page-modification/`
**Prerequisites**: plan.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅), quickstart.md (✅)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Next.js 15.5.3, React 18+, TypeScript 5.0+, Tailwind CSS
   → Dependencies: @supabase/supabase-js, next-auth, prismjs (new)
   → Project type: Web application (frontend + backend API routes)
2. Load design documents: ✅
   → data-model.md: UI state models, filter/sort interfaces
   → contracts/: Enhanced reports API with filtering and export
   → research.md: Console logs ✅ implemented, CSV export ✅ implemented
3. Generate tasks by category:
   → Setup: Add prismjs dependency, TypeScript interfaces
   → Tests: Contract tests, component tests, E2E scenarios
   → Core: Enhanced table components, filter logic, export integration
   → Integration: API enhancements, page updates
   → Polish: Performance validation, accessibility
4. Task rules applied:
   → Different component files = [P] parallel
   → API route modifications = sequential
   → Tests before implementation (TDD)
5. Tasks numbered T001-T024
6. Dependencies mapped and validated
7. Parallel execution examples provided
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute for Next.js App Router structure

## Path Conventions
- **Frontend Components**: `/components/reports/`
- **API Routes**: `/app/api/projects/[projectId]/`
- **Custom Hooks**: `/hooks/`
- **Types**: `/types/`
- **Tests**: `/tests/e2e/`, `/tests/unit/`

## Phase 3.1: Setup & Dependencies
- [ ] T001 Install prismjs dependency and types in package.json
- [ ] T002 [P] Create TypeScript interfaces from contracts in types/reports.ts
- [ ] T003 [P] Update CLAUDE.md with prismjs syntax highlighting capability

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Contract test enhanced GET /api/projects/{projectId}/reports with filtering in tests/e2e/reports-api-enhancements.spec.ts
- [ ] T005 [P] Contract test POST /api/projects/{projectId}/reports/export in tests/e2e/export-functionality.spec.ts
- [ ] T006 [P] E2E test enhanced data table display (Scenario 1) in tests/e2e/enhanced-reports-table.spec.ts
- [ ] T007 [P] E2E test column filtering functionality (Scenario 2) in tests/e2e/enhanced-reports-table.spec.ts
- [ ] T008 [P] E2E test hover tooltips (Scenario 3) in tests/e2e/enhanced-reports-table.spec.ts
- [ ] T009 [P] E2E test export mode activation and CSV generation (Scenarios 8-10) in tests/e2e/export-functionality.spec.ts
- [ ] T010 [P] E2E test syntax highlighting in log viewer (Scenario 7) in tests/e2e/log-viewer-enhancements.spec.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T011 [P] Create ReportsTableFilter component with all filter inputs in components/reports/ReportsTableFilter.tsx
- [ ] T012 [P] Create ReportTableRow component with hover tooltips and selection in components/reports/ReportTableRow.tsx
- [ ] T013 [P] Create ExportPanel component for selection mode and CSV export in components/reports/ExportPanel.tsx
- [ ] T014 [P] Create useReportsTable custom hook for state management in hooks/useReportsTable.ts
- [ ] T015 [P] Create useCopyToClipboard hook for log copy functionality in hooks/useCopyToClipboard.ts
- [ ] T016 Create EnhancedReportsTable main component integrating all sub-components in components/reports/EnhancedReportsTable.tsx
- [ ] T017 [P] Add prismjs syntax highlighting to existing ReportDetail component in components/reports/ReportDetail.tsx
- [ ] T018 [P] Create ReportTooltip component for title/description display in components/reports/ReportTooltip.tsx

## Phase 3.4: API Integration
- [ ] T019 Enhance GET /api/projects/[projectId]/reports route with filtering and sorting in app/api/projects/[projectId]/reports/route.ts
- [ ] T020 Enhance POST /api/projects/[projectId]/reports/export route with selection support in app/api/projects/[projectId]/reports/export/route.ts
- [ ] T021 Update reports page to use EnhancedReportsTable component in app/dashboard/projects/[projectId]/reports/page.tsx

## Phase 3.5: Polish & Validation
- [ ] T022 [P] Performance validation tests (<500ms table, <100ms filters) in tests/e2e/performance-validation.spec.ts
- [ ] T023 [P] Unit tests for filtering logic and export functions in tests/unit/reports-functionality.test.ts
- [ ] T024 Execute quickstart.md validation scenarios manually

## Dependencies
- Setup (T001-T003) before everything
- Tests (T004-T010) before implementation (T011-T021)
- T016 requires T011-T015 (sub-components)
- T019-T021 sequential (API integration order)
- Implementation before polish (T022-T024)

## Parallel Execution Examples

### Phase 3.2 Tests (can run simultaneously):
```bash
# Launch all test creation tasks together:
Task: "Contract test enhanced GET /api/projects/{projectId}/reports with filtering in tests/e2e/reports-api-enhancements.spec.ts"
Task: "Contract test POST /api/projects/{projectId}/reports/export in tests/e2e/export-functionality.spec.ts"
Task: "E2E test enhanced data table display (Scenario 1) in tests/e2e/enhanced-reports-table.spec.ts"
Task: "E2E test column filtering functionality (Scenario 2) in tests/e2e/enhanced-reports-table.spec.ts"
Task: "E2E test hover tooltips (Scenario 3) in tests/e2e/enhanced-reports-table.spec.ts"
Task: "E2E test export mode activation and CSV generation (Scenarios 8-10) in tests/e2e/export-functionality.spec.ts"
Task: "E2E test syntax highlighting in log viewer (Scenario 7) in tests/e2e/log-viewer-enhancements.spec.ts"
```

### Phase 3.3 Component Development (can run simultaneously):
```bash
# Launch component creation tasks together:
Task: "Create ReportsTableFilter component with all filter inputs in components/reports/ReportsTableFilter.tsx"
Task: "Create ReportTableRow component with hover tooltips and selection in components/reports/ReportTableRow.tsx"
Task: "Create ExportPanel component for selection mode and CSV export in components/reports/ExportPanel.tsx"
Task: "Create useReportsTable custom hook for state management in hooks/useReportsTable.ts"
Task: "Create useCopyToClipboard hook for log copy functionality in hooks/useCopyToClipboard.ts"
Task: "Add prismjs syntax highlighting to existing ReportDetail component in components/reports/ReportDetail.tsx"
Task: "Create ReportTooltip component for title/description display in components/reports/ReportTooltip.tsx"
```

## Key Implementation Notes

### Leveraging Existing Functionality
- **Console Logs**: ReportDetail.tsx already has terminal-style display and copy functionality
- **CSV Export**: exportService.ts already implements CSV generation and multiple formats
- **Database**: fl_reports table console_logs and network_requests JSON fields support all requirements
- **Authentication**: Existing NextAuth.js and RLS policies maintained

### New Dependencies
- **prismjs**: For JSON/JavaScript syntax highlighting in console logs
- **No other external dependencies required**

### Performance Targets
- Table rendering: <500ms for 100+ reports
- Filter operations: <100ms response time
- Export generation: <5 seconds for 100+ reports
- Memory usage: Stable during all operations

### File Structure Impact
```
components/reports/
├── EnhancedReportsTable.tsx        # Main table component [NEW]
├── ReportsTableFilter.tsx          # Filter controls [NEW]
├── ReportTableRow.tsx              # Individual row [NEW]
├── ExportPanel.tsx                 # Export UI [NEW]
├── ReportTooltip.tsx               # Hover tooltips [NEW]
└── ReportDetail.tsx                # Enhanced with syntax highlighting [MODIFIED]

hooks/
├── useReportsTable.ts              # Table state management [NEW]
└── useCopyToClipboard.ts           # Copy functionality [NEW]

types/
└── reports.ts                      # Interface definitions [NEW]

app/api/projects/[projectId]/
├── reports/route.ts                # Enhanced with filtering [MODIFIED]
└── reports/export/route.ts         # Enhanced selection support [MODIFIED]

app/dashboard/projects/[projectId]/
└── reports/page.tsx                # Updated to use new table [MODIFIED]
```

## Validation Checklist
*GATE: Checked before implementation begins*

- [✅] All contracts have corresponding tests (T004-T005)
- [✅] All major components have test coverage (T006-T010)
- [✅] All tests come before implementation (Phase 3.2 → 3.3)
- [✅] Parallel tasks truly independent (different files)
- [✅] Each task specifies exact file path
- [✅] No task modifies same file as another [P] task
- [✅] Leverages existing functionality (console logs, export, database)
- [✅] No breaking changes to existing API or database schema