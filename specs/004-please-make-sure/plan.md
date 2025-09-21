# Implementation Plan: Enhanced Log Visualization

**Branch**: `004-please-make-sure` | **Date**: 2025-09-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-please-make-sure/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✓ Loaded from /specs/004-please-make-sure/spec.md
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✓ All clarifications resolved (performance thresholds, privacy, retention)
   → ✓ Project Type: web (Next.js frontend + API backend)
   → ✓ Structure Decision: Web application pattern
3. Fill the Constitution Check section based on constitution document
   → ✓ Constitution template found (no specific rules defined)
4. Evaluate Constitution Check section below
   → ✓ No violations detected (constitution not customized)
   → ✓ Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✓ Research completed
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✓ Artifacts generated
7. Re-evaluate Constitution Check section
   → ✓ No new violations
   → ✓ Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach
   → ✓ Task breakdown strategy defined
9. STOP - Ready for /tasks command
```

## Summary
Enhanced log visualization for bug reports with network waterfall charts, Core Web Vitals metrics, and intelligent error correlation. Building incrementally on existing Prism.js syntax highlighting and JSON storage infrastructure through a 4-phase approach that minimizes breaking changes while adding powerful diagnostic capabilities.

## Technical Context
**Language/Version**: TypeScript 5.0+ / Node.js 18+
**Primary Dependencies**: Next.js 15.5.3, React 18+, Prism.js, Tailwind CSS
**Storage**: Supabase PostgreSQL with JSON columns (console_logs, network_requests)
**Testing**: Jest for unit tests, Playwright for E2E
**Target Platform**: Web application (responsive design)
**Project Type**: web - Full-stack Next.js application
**Performance Goals**: <100ms filtering operations, <2s initial load
**Constraints**: 10MB payload limit, backward compatibility required
**Scale/Scope**: ~100-1000 reports per project, ~50-100 concurrent users

**User-Provided Context**:
- Current implementation has enhanced reports table with Prism.js
- Database uses fl_reports table with JSON columns
- Widget already supports GZIP compression for large payloads
- Export to CSV functionality exists
- Terminal-style log viewer implemented

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Research)
- [x] **Simplicity**: Leverages existing infrastructure (JSON columns, Prism.js)
- [x] **Incremental**: 4-phase approach allows gradual deployment
- [x] **Testability**: Each phase independently testable
- [x] **Backward Compatible**: No breaking changes to existing data

### Post-Design Check (After Phase 1)
- [x] **Data Model**: Uses existing schema with optional new columns - PASSED
- [x] **API Contracts**: RESTful endpoints follow existing patterns - PASSED
- [x] **Performance**: Client-side filtering for speed - PASSED
- [x] **Security**: Privacy consent for user tracking - PASSED
- [x] **Backward Compatibility**: No breaking changes to existing APIs - PASSED
- [x] **Testability**: Each component independently testable - PASSED
- [x] **Observability**: Enhanced logging and monitoring capabilities - PASSED

## Project Structure

### Documentation (this feature)
```
specs/004-please-make-sure/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (technical analysis)
├── data-model.md        # Phase 1 output (schema design)
├── quickstart.md        # Phase 1 output (dev guide)
├── CLAUDE.md            # Phase 1 output (AI assistance guide)
├── contracts/           # Phase 1 output (API contracts)
│   ├── widget-api.md    # Enhanced widget data collection
│   ├── reports-api.md   # Reports visualization endpoints
│   └── export-api.md    # Enhanced export formats
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Web application structure (Next.js App Router)
app/
├── api/
│   ├── widget/
│   │   └── submit/      # Enhanced data collection endpoint
│   └── projects/[id]/
│       └── reports/
│           ├── route.ts  # Enhanced filtering/sorting
│           └── [reportId]/
│               └── performance/ # New performance endpoint
├── dashboard/
│   └── projects/[id]/
│       └── reports/
│           ├── page.tsx  # Reports list with waterfall
│           └── [reportId]/
│               └── page.tsx # Enhanced detail view
└── components/
    └── reports/
        ├── NetworkWaterfall.tsx    # New waterfall chart
        ├── PerformanceMetrics.tsx  # Core Web Vitals display
        ├── ErrorCorrelation.tsx    # Error linking UI
        └── LogPatternDetector.tsx  # Pattern analysis

public/widget/
├── feedloop-widget.js   # Enhanced collection logic
└── dist/                # Built widget versions

lib/
├── database/
│   └── migrations/      # Optional new columns
├── utils/
│   ├── performance.ts   # Threshold calculations
│   └── correlation.ts   # Error-network linking
└── types/
    └── diagnostics.ts   # Enhanced type definitions

tests/
├── e2e/
│   └── reports-visualization.spec.ts
├── integration/
│   └── widget-collection.test.ts
└── unit/
    ├── performance-metrics.test.ts
    └── waterfall-chart.test.ts
```

## Progress Tracking

### Planning Phase (/plan command)
- [x] **Initial Constitution Check** - Passed
- [x] **Phase 0: Research** - Complete (research.md created)
- [x] **Phase 1: Design** - Complete (contracts/, data-model.md, quickstart.md, CLAUDE.md created)
- [x] **Post-Design Constitution Check** - Passed
- [x] **Phase 2 Planning** - Task generation approach defined
- [x] **All Artifacts Generated** - Ready for /tasks command

### Implementation Phases (future commands)
- [ ] **Phase 2: Tasks** - Awaiting /tasks command
- [ ] **Phase 3: Implementation** - Not started
- [ ] **Phase 4: Testing & Deployment** - Not started

## Phase 2 Task Generation Approach

When `/tasks` command is executed, tasks will be organized by the 4-phase implementation strategy:

1. **Phase 1 Tasks**: Widget Enhancement (Data Collection)
   - Add Performance Observer integration
   - Implement error boundary capture
   - Add interaction tracking with consent
   - Enhance network timing capture

2. **Phase 2 Tasks**: Storage Layer (Database/API)
   - Implement Option 1 (JSON storage) or Option 2 (new columns)
   - Update API endpoints for new data
   - Add compression for large payloads
   - Implement privacy consent storage

3. **Phase 3 Tasks**: UI Components (Visualization)
   - Build NetworkWaterfall component
   - Create PerformanceMetrics display
   - Implement ErrorCorrelation linking
   - Add LogPatternDetector

4. **Phase 4 Tasks**: Integration & Testing
   - End-to-end testing
   - Performance optimization
   - Documentation updates
   - Deployment configuration

## Next Steps
Run `/tasks` command to generate detailed task breakdown in tasks.md