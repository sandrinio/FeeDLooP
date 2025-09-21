# Tasks: Enhanced Log Visualization

**Input**: Design documents from `/specs/004-please-make-sure/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✓ Found: Next.js 15.5.3, React 18+, TypeScript 5.0+, Supabase PostgreSQL
   → ✓ Structure: Web application with app/ directory and components/
2. Load optional design documents:
   → ✓ data-model.md: Enhanced Report, Performance Metrics, Network Entry entities
   → ✓ contracts/: widget-api.md, reports-api.md, export-api.md
   → ✓ research.md: 4-phase approach, existing infrastructure leverage
3. Generate tasks by category:
   → Setup: Dependencies, database schema, types
   → Tests: Contract tests for 3 API endpoints, E2E tests
   → Core: Widget enhancement, UI components, API endpoints
   → Integration: Database updates, visualization charts
   → Polish: Performance optimization, documentation
4. Apply task rules:
   → Widget/UI/API files = parallel [P] where no dependencies
   → Same files = sequential (API routes, widget updates)
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T045)
6. 4-phase implementation strategy from research.md
7. Includes SQL migration scripts for database changes
8. ✓ All contracts have tests, entities have models, endpoints implemented
9. Return: SUCCESS (45 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Includes exact file paths and SQL scripts
- Based on 4-phase incremental approach

## Path Conventions
- **Next.js App Router**: `app/`, `components/`, `lib/`, `public/`
- **Tests**: `tests/unit/`, `tests/e2e/`, `tests/integration/`
- **Database**: SQL scripts for Supabase execution

## Phase 1: Setup & Database Preparation
- [ ] T001 Create TypeScript interfaces in lib/types/diagnostics.ts
- [ ] T002 [P] Add Performance Observer polyfill types in lib/types/performance.ts
- [ ] T003 Create database migration script (Option 2): migrations/003-enhanced-diagnostics.sql
- [ ] T004 [P] Install canvas testing dependencies: jest-canvas-mock, @types/web
- [ ] T005 [P] Create utility functions in lib/utils/performance.ts for threshold calculations

## Phase 2: Contract Tests First (TDD) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T006 [P] Contract test enhanced widget submission in tests/integration/widget-api.test.ts
- [ ] T007 [P] Contract test enhanced reports endpoint in tests/integration/reports-api.test.ts
- [ ] T008 [P] Contract test export API with new formats in tests/integration/export-api.test.ts
- [ ] T009 [P] E2E test network waterfall visualization in tests/e2e/network-waterfall.spec.ts
- [ ] T010 [P] E2E test performance metrics display in tests/e2e/performance-metrics.spec.ts
- [ ] T011 [P] E2E test error correlation UI in tests/e2e/error-correlation.spec.ts

## Phase 3: Widget Enhancement (ONLY after tests are failing)
- [ ] T012 Add Performance Observer integration in public/widget/feedloop-widget.js
- [ ] T013 Add enhanced error boundary capture in public/widget/feedloop-widget.js
- [ ] T014 Add privacy consent banner in public/widget/feedloop-widget.js
- [ ] T015 Add user interaction tracking in public/widget/feedloop-widget.js
- [ ] T016 Enhance network request timing collection in public/widget/feedloop-widget.js
- [ ] T017 Update widget build script for version 2.0.0 in scripts/build-widget.js

## Phase 4: API Enhancements
- [ ] T018 Enhance widget submission endpoint in app/api/widget/submit/route.ts
- [ ] T019 Add performance metrics parsing in app/api/widget/submit/route.ts
- [ ] T020 Enhance reports list API with new filters in app/api/projects/[id]/reports/route.ts
- [ ] T021 Add performance endpoint in app/api/projects/[id]/reports/[reportId]/performance/route.ts
- [ ] T022 Enhance reports detail API in app/api/projects/[id]/reports/[reportId]/route.ts
- [ ] T023 Add pattern analysis endpoint in app/api/projects/[id]/reports/patterns/route.ts

## Phase 5: UI Components (Core Visualization)
- [ ] T024 [P] Create NetworkWaterfall component in components/reports/NetworkWaterfall.tsx
- [ ] T025 [P] Create PerformanceMetrics component in components/reports/PerformanceMetrics.tsx
- [ ] T026 [P] Create ErrorCorrelation component in components/reports/ErrorCorrelation.tsx
- [ ] T027 [P] Create LogPatternDetector component in components/reports/LogPatternDetector.tsx
- [ ] T028 [P] Create ConsentBanner component in components/widget/ConsentBanner.tsx
- [ ] T029 [P] Create performance categorization utility in lib/utils/performance-categories.ts
- [ ] T030 [P] Create error correlation logic in lib/utils/error-correlation.ts

## Phase 6: Page Integration
- [ ] T031 Enhance reports list page in app/dashboard/projects/[id]/reports/page.tsx
- [ ] T032 Enhance report detail page in app/dashboard/projects/[id]/reports/[reportId]/page.tsx
- [ ] T033 Add performance analysis view in app/dashboard/projects/[id]/reports/[reportId]/performance/page.tsx
- [ ] T034 Update export functionality in app/dashboard/projects/[id]/reports/export/page.tsx

## Phase 7: Export Enhancement
- [ ] T035 [P] Add JSON export format in lib/export/json-exporter.ts
- [ ] T036 [P] Add Excel export format in lib/export/excel-exporter.ts
- [ ] T037 [P] Add export template system in lib/export/template-manager.ts
- [ ] T038 Update CSV export with new fields in lib/export/csv-exporter.ts

## Phase 8: Database Integration
- [ ] T039 Execute database migration (if using Option 2) - Run migrations/003-enhanced-diagnostics.sql
- [ ] T040 Update database query functions in lib/database/reports-queries.ts
- [ ] T041 Add performance metrics indexing in lib/database/performance-queries.ts
- [ ] T042 [P] Create database seeders with sample enhanced data in lib/database/seeders/enhanced-reports.ts

## Phase 9: Polish & Performance
- [ ] T043 [P] Unit tests for performance utilities in tests/unit/performance-utils.test.ts
- [ ] T044 [P] Unit tests for waterfall calculations in tests/unit/waterfall-chart.test.ts
- [ ] T045 [P] Performance optimization for large datasets in lib/utils/virtual-scrolling.ts

## Dependencies
- **Setup** (T001-T005) must complete before all other phases
- **Contract Tests** (T006-T011) must complete and FAIL before implementation
- **Widget** (T012-T017) can run in parallel but must complete before API enhancements
- **API** (T018-T023) must complete before UI integration
- **UI Components** (T024-T030) can run in parallel with each other
- **Integration** (T031-T034) depends on completed UI components
- **Export** (T035-T038) can run in parallel with integration
- **Database** (T039-T042) can run in parallel once schema is ready
- **Polish** (T043-T045) must be last

## Parallel Execution Examples

### Contract Tests (After Setup)
```bash
# Run these together after T001-T005:
claude task "Contract test enhanced widget submission in tests/integration/widget-api.test.ts"
claude task "Contract test enhanced reports endpoint in tests/integration/reports-api.test.ts"
claude task "Contract test export API with new formats in tests/integration/export-api.test.ts"
```

### UI Components (After API completion)
```bash
# Run these together after T018-T023:
claude task "Create NetworkWaterfall component in components/reports/NetworkWaterfall.tsx"
claude task "Create PerformanceMetrics component in components/reports/PerformanceMetrics.tsx"
claude task "Create ErrorCorrelation component in components/reports/ErrorCorrelation.tsx"
claude task "Create LogPatternDetector component in components/reports/LogPatternDetector.tsx"
```

### Export Formats (Independent)
```bash
# Run these together:
claude task "Add JSON export format in lib/export/json-exporter.ts"
claude task "Add Excel export format in lib/export/excel-exporter.ts"
claude task "Add export template system in lib/export/template-manager.ts"
```

## SQL Migration Script

**File**: `migrations/003-enhanced-diagnostics.sql`
**Execute in Supabase SQL Editor**:

```sql
-- Enhanced Log Visualization - Database Schema Extension
-- Execute this script in Supabase to add optional dedicated columns

-- Add new JSON columns for enhanced diagnostic data
ALTER TABLE fl_reports
ADD COLUMN IF NOT EXISTS performance_metrics JSON,
ADD COLUMN IF NOT EXISTS interaction_data JSON,
ADD COLUMN IF NOT EXISTS error_context JSON;

-- Create indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_lcp
ON fl_reports((performance_metrics->'web_vitals'->>'lcp')::numeric);

CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_fcp
ON fl_reports((performance_metrics->'web_vitals'->>'fcp')::numeric);

CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_cls
ON fl_reports((performance_metrics->'web_vitals'->>'cls')::numeric);

CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_category
ON fl_reports((performance_metrics->'categorization'->>'overall'));

CREATE INDEX IF NOT EXISTS idx_fl_reports_error_count
ON fl_reports((error_context->>'total_error_count')::numeric);

CREATE INDEX IF NOT EXISTS idx_fl_reports_interaction_consent
ON fl_reports((interaction_data->>'consent_given')::boolean);

-- Add comments for documentation
COMMENT ON COLUMN fl_reports.performance_metrics IS
'Core Web Vitals and performance timing data collected from browser Performance Observer API';

COMMENT ON COLUMN fl_reports.interaction_data IS
'Anonymized user interaction tracking data (requires explicit user consent)';

COMMENT ON COLUMN fl_reports.error_context IS
'Enhanced error information including stack traces, promise rejections, and error patterns';

-- Verify schema changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'fl_reports'
  AND column_name IN ('performance_metrics', 'interaction_data', 'error_context')
ORDER BY column_name;

-- Show new indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'fl_reports'
  AND indexname LIKE 'idx_fl_reports_perf_%'
   OR indexname LIKE 'idx_fl_reports_error_%'
   OR indexname LIKE 'idx_fl_reports_interaction_%';
```

## Database Migration Notes

### Option 1: Embedded JSON (No Migration Required)
- Store enhanced data within existing `console_logs` and `network_requests` columns
- Backward compatible, no downtime
- Good for initial deployment

### Option 2: Dedicated Columns (Recommended for Scale)
- Execute the SQL script above in Supabase
- Better query performance with dedicated indexes
- Cleaner data organization
- Recommended after validating data structure

### Migration Safety
- Script uses `IF NOT EXISTS` for safety
- Can be run multiple times without errors
- Backward compatible with existing data
- No data loss risk

## File Dependencies Map

```
Widget Files (Sequential):
public/widget/feedloop-widget.js (T012-T016)
scripts/build-widget.js (T017)

API Files (Sequential within each):
app/api/widget/submit/route.ts (T018-T019)
app/api/projects/[id]/reports/route.ts (T020)
app/api/projects/[id]/reports/[reportId]/route.ts (T022)

UI Components (Parallel):
components/reports/NetworkWaterfall.tsx (T024)
components/reports/PerformanceMetrics.tsx (T025)
components/reports/ErrorCorrelation.tsx (T026)
components/reports/LogPatternDetector.tsx (T027)

Utility Files (Parallel):
lib/utils/performance.ts (T005)
lib/utils/performance-categories.ts (T029)
lib/utils/error-correlation.ts (T030)
```

## Success Criteria
- [ ] All contract tests pass
- [ ] Widget collects Core Web Vitals and enhanced error data
- [ ] Network waterfall chart renders correctly
- [ ] Performance categorization works with defined thresholds
- [ ] Export includes enhanced data in JSON/Excel formats
- [ ] Privacy consent flow functions properly
- [ ] Backward compatibility maintained
- [ ] Performance goals met (<100ms filtering)

## Notes
- **TDD Critical**: Tests T006-T011 must fail before implementation
- **Incremental**: Each phase can be deployed independently
- **Database**: Choose Option 1 or 2 based on scale needs
- **Privacy**: Consent required for interaction tracking
- **Performance**: Use virtual scrolling for large datasets
- **Backward Compatibility**: All existing functionality preserved