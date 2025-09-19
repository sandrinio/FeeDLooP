
# Implementation Plan: FeeDLooP MVP - Feedback Collection Service

**Branch**: `001-feedloop-initial-plan` | **Date**: 2025-01-19 | **Spec**: [specs/001-feedloop-initial-plan/spec.md]
**Input**: Feature specification from `/specs/001-feedloop-initial-plan/spec.md`

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
FeeDLooP MVP is a feedback collection service that enables software development companies to collect structured feedback (bugs, feature requests, general feedback) from clients and testers during development. The solution provides an embeddable JavaScript widget (like Google Analytics) that displays as a sticky tab on websites, opens to a slide-out form, and captures feedback with automatic diagnostic data for bug reports. The system includes a web-based project management dashboard with authentication, team collaboration, rich text editing, image attachments, and CSV export functionality for Jira/Azure DevOps integration.

## Technical Context
**Language/Version**: TypeScript/JavaScript with Node.js 18+, React 18+, Next.js 14+ with App Router
**Primary Dependencies**: Next.js, React, TypeScript, Tailwind CSS, NextAuth.js, Supabase, MinIO, React Hook Form, Zod
**Storage**: PostgreSQL (via Supabase) for application data, MinIO (S3-compatible) for file storage
**Testing**: Jest for unit tests, Playwright for E2E tests, React Testing Library for component tests
**Target Platform**: Web application (dashboard) + embeddable JavaScript widget for client websites
**Project Type**: web - frontend dashboard + backend API + embeddable widget
**Performance Goals**: Widget load time <500ms, dashboard response <200ms, support concurrent feedback submission
**Constraints**: Widget must not interfere with host website (CSS isolation), support modern browsers, GDPR compliant
**Scale/Scope**: MVP targeting small-medium development teams (10-50 users per project), 1000+ feedback reports per project

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Test-First Development**: ✅ PASS - Plan includes contract tests, unit tests, integration tests before implementation
**Simplicity Principle**: ✅ PASS - Using established patterns (Next.js, Supabase) rather than custom solutions
**Library-First Approach**: ✅ PASS - Widget designed as standalone embeddable library with clear API contract
**Observability**: ✅ PASS - Plan includes error handling, logging capabilities via structured data capture
**Dependencies**: ✅ PASS - All dependencies are production-ready with strong community support
**Security**: ✅ PASS - Authentication via NextAuth.js, RLS policies, input validation with Zod

**Post-Design Re-evaluation**: ✅ PASS
- Data model follows normalized relational design principles
- API contracts use standard REST patterns with OpenAPI documentation
- Database schema includes proper indexes and RLS policies
- Widget maintains CSS isolation and minimal footprint
- No new constitutional violations introduced during design phase

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

**Structure Decision**: Option 2 (Web application) - Frontend dashboard + backend API + embeddable widget requires separation of concerns

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
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Database tasks from data-model.md (5 tables with fl_ prefix)
- API endpoint tasks from api-spec.yaml (15 endpoints across 6 controllers)
- Widget integration tasks from quickstart.md scenarios
- UI component tasks for dashboard from user stories
- Test tasks from quickstart validation scenarios

**Specific Task Categories**:
1. **Database Setup** [P] - Supabase migrations for fl_* tables with RLS policies
2. **Contract Tests** [P] - API endpoint tests from OpenAPI spec (15 tests)
3. **Data Models** [P] - TypeScript interfaces and Zod schemas for entities
4. **Authentication** - NextAuth.js setup and protected route middleware
5. **Widget Development** - Standalone embeddable script with CSS isolation
6. **Dashboard Components** - React components for project management UI
7. **Integration Tests** - End-to-end scenarios from quickstart.md
8. **File Storage** - MinIO integration for attachment uploads

**Ordering Strategy**:
- TDD order: Contract tests → Models → Services → UI components
- Dependency order: Database → Auth → Core services → Widget → Dashboard
- Parallel execution for independent components marked [P]
- Widget and Dashboard can be developed in parallel after core services

**Estimated Output**: 28-35 numbered, ordered tasks in tasks.md
- Database setup: 5 tasks
- Contract tests: 15 tasks
- Data models: 5 tasks
- Authentication: 3 tasks
- Widget: 4 tasks
- Dashboard: 6-8 tasks
- Integration tests: 3 tasks

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
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
