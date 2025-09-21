
# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Enhanced Reports Dashboard with Advanced Data Table and Developer-Friendly Log Viewer - Enhance the existing reports page with improved UI/UX for data tables including filtering, hover descriptions, terminal-style log viewer with copy functionality, and CSV export capabilities with selection mode.

## Technical Context
**Language/Version**: TypeScript 5.0+, JavaScript ES2022
**Primary Dependencies**: Next.js 15.5.3, React 18+, Tailwind CSS, @supabase/supabase-js, next-auth
**Storage**: Supabase PostgreSQL with RLS, console_logs and network_requests JSON fields
**Testing**: Playwright E2E testing, Jest unit tests, TypeScript compilation checks
**Target Platform**: Web application (Next.js App Router), self-hosted deployment via Coolify
**Project Type**: web - frontend + backend API routes
**Performance Goals**: <500ms table rendering, <100ms filter operations, smooth scrolling for logs
**Constraints**: Existing database schema (fl_reports table), maintain current authentication flow, RLS policies
**Scale/Scope**: Existing codebase modification, ~5-10 new components, CSV export up to 1000 records

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Database Schema Constraints**: ✅ PASS - Modifying existing fl_reports table structure, using existing console_logs and network_requests JSON fields
**Authentication & Security**: ✅ PASS - Maintaining existing NextAuth.js and RLS policies, no new authentication requirements
**Component Architecture**: ✅ PASS - Building on existing React component patterns, reusing Tailwind CSS utilities
**API Compatibility**: ✅ PASS - Enhancing existing report endpoints, no breaking changes to widget API
**Performance Standards**: ✅ PASS - Table enhancements will improve performance with client-side filtering and pagination

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: [DEFAULT to Option 1 unless Technical Context indicates web/mobile app]

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
Based on research findings, most functionality already exists. Tasks will focus on:
- **Enhancement Tasks**: Modify existing components (ReportDetail.tsx already has logs/copy)
- **New Component Tasks**: Create ReportsTable with filtering and selection
- **Integration Tasks**: Connect export service with new table UI
- **Dependency Tasks**: Add prismjs for syntax highlighting
- **Testing Tasks**: E2E tests for new functionality

**Specific Task Categories**:
1. **Dependencies & Setup** (1-2 tasks)
   - Install prismjs for syntax highlighting
   - Update package.json and types

2. **API Enhancements** (2-3 tasks)
   - Enhance reports listing endpoint with filtering
   - Add export endpoint enhancements
   - Update API response interfaces

3. **Component Development** (8-12 tasks)
   - Create EnhancedReportsTable component [P]
   - Create ReportTableRow with tooltips [P]
   - Create TableFilters component [P]
   - Create ExportPanel component [P]
   - Update ReportDetail with syntax highlighting [P]
   - Create custom hooks for table state management [P]

4. **Integration Tasks** (3-4 tasks)
   - Integrate new table with existing reports pages
   - Connect export functionality
   - Update navigation and routing

5. **Testing Tasks** (6-8 tasks)
   - E2E tests for table filtering [P]
   - E2E tests for export functionality [P]
   - E2E tests for log viewer enhancements [P]
   - Component unit tests [P]
   - Performance validation tests [P]

**Ordering Strategy**:
- **Phase 1**: Dependencies and API enhancements (foundational)
- **Phase 2**: Component development (can be parallel)
- **Phase 3**: Integration and page updates (requires components)
- **Phase 4**: Testing and validation (requires implementation)

**Key Efficiency Notes**:
- Leverage existing ReportDetail.tsx console log implementation
- Reuse existing export service functionality
- Build on current Tailwind CSS patterns
- No database schema changes required

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md (fewer than typical due to existing functionality)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - 24 tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (FR-009 syntax highlighting clarified)
- [x] Complexity deviations documented (none required - building on existing functionality)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
