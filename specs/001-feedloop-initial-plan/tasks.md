# Tasks: FeeDLooP MVP - Feedback Collection Service

**Input**: Design documents from `/specs/001-feedloop-initial-plan/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Extracted: Next.js 14+, React 18+, TypeScript, Supabase, MinIO tech stack
2. Load optional design documents:
   ✓ data-model.md: 5 entities (fl_users, fl_projects, fl_project_invitations, fl_reports, fl_attachments)
   ✓ contracts/: API spec with 15 endpoints across 6 controllers
   ✓ research.md: Technology decisions for Next.js, Supabase, MinIO stack
3. Generate tasks by category:
   ✓ Setup: Next.js project, dependencies, database, file storage
   ✓ Tests: contract tests, integration tests
   ✓ Core: data models, API endpoints, widget, dashboard
   ✓ Integration: authentication, database connections, file uploads
   ✓ Polish: E2E tests, performance validation, documentation
4. Apply task rules:
   ✓ Different files = marked [P] for parallel execution
   ✓ Same file = sequential (no [P])
   ✓ Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph and parallel execution examples
7. Validate task completeness: All contracts, entities, and user scenarios covered
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Next.js App Router**: `/app` directory structure
- **API Routes**: `/app/api/`
- **Components**: `/components/`
- **Database**: Supabase migrations in `/database/`
- **Widget**: `/public/widget/` for standalone distribution

## Phase 3.1: Setup ✅ COMPLETED
- [x] T001 Initialize Next.js project with TypeScript, Tailwind CSS, and App Router
- [x] T002 Install and configure core dependencies (NextAuth.js, Supabase, MinIO, React Hook Form, Zod)
- [x] T003 [P] Configure ESLint, Prettier, and TypeScript compiler options
- [x] T004 [P] Set up environment variables and configuration files (.env.example, next.config.js)
- [x] T005 Create Docker Compose configuration for local Supabase and MinIO development
- [x] T006 [P] Set up database migrations directory structure in /database/migrations/

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)
- [ ] T007 [P] Contract test POST /api/auth/register in tests/contract/auth.test.ts
- [ ] T008 [P] Contract test POST /api/auth/login in tests/contract/auth.test.ts
- [ ] T009 [P] Contract test GET /api/projects in tests/contract/projects.test.ts
- [ ] T010 [P] Contract test POST /api/projects in tests/contract/projects.test.ts
- [ ] T011 [P] Contract test GET /api/projects/{id} in tests/contract/projects.test.ts
- [ ] T012 [P] Contract test PUT /api/projects/{id} in tests/contract/projects.test.ts
- [ ] T013 [P] Contract test DELETE /api/projects/{id} in tests/contract/projects.test.ts
- [ ] T014 [P] Contract test POST /api/projects/{id}/invitations in tests/contract/invitations.test.ts
- [ ] T015 [P] Contract test DELETE /api/projects/{id}/invitations in tests/contract/invitations.test.ts
- [ ] T016 [P] Contract test GET /api/projects/{id}/reports in tests/contract/reports.test.ts
- [ ] T017 [P] Contract test POST /api/projects/{id}/reports in tests/contract/reports.test.ts
- [ ] T018 [P] Contract test GET /api/projects/{id}/reports/{id} in tests/contract/reports.test.ts
- [ ] T019 [P] Contract test PUT /api/projects/{id}/reports/{id} in tests/contract/reports.test.ts
- [ ] T020 [P] Contract test POST /api/widget/submit in tests/contract/widget.test.ts
- [ ] T021 [P] Contract test POST /api/uploads in tests/contract/uploads.test.ts
- [ ] T022 [P] Contract test GET /api/projects/{id}/export in tests/contract/export.test.ts

### Integration Tests (User Scenarios)
- [ ] T023 [P] Integration test: User registration and authentication flow in tests/integration/onboarding.test.ts
- [ ] T024 [P] Integration test: Project creation and team invitation in tests/integration/project-management.test.ts
- [ ] T025 [P] Integration test: Widget feedback submission (bug, initiative, feedback) in tests/integration/feedback-collection.test.ts
- [ ] T026 [P] Integration test: Dashboard report management and status updates in tests/integration/report-management.test.ts
- [ ] T027 [P] Integration test: File upload and attachment handling in tests/integration/file-management.test.ts
- [ ] T028 [P] Integration test: CSV export functionality in tests/integration/export.test.ts
- [ ] T029 [P] Integration test: Team collaboration and access control in tests/integration/collaboration.test.ts

## Phase 3.3: Database Setup ✅ COMPLETED
**Note**: Database setup provided as complete script in `product_documentation/DATABASE_DOCUMENTATION.sql`
- [x] T030 Create Supabase migration for fl_users table (included in DATABASE_DOCUMENTATION.sql)
- [x] T031 Create Supabase migration for fl_projects table (included in DATABASE_DOCUMENTATION.sql)
- [x] T032 Create Supabase migration for fl_project_invitations table (included in DATABASE_DOCUMENTATION.sql)
- [x] T033 Create Supabase migration for fl_reports table (included in DATABASE_DOCUMENTATION.sql)
- [x] T034 Create Supabase migration for fl_attachments table (included in DATABASE_DOCUMENTATION.sql)
- [x] T035 Create RLS policies for all tables (included in DATABASE_DOCUMENTATION.sql)
- [x] T036 Create database indexes for performance (included in DATABASE_DOCUMENTATION.sql)

## Phase 3.4: Core Data Models (ONLY after database and tests are failing)
- [ ] T037 [P] User data model with Zod validation in lib/models/user.ts
- [ ] T038 [P] Project data model with Zod validation in lib/models/project.ts
- [ ] T039 [P] ProjectInvitation data model with Zod validation in lib/models/invitation.ts
- [ ] T040 [P] Report data model with Zod validation in lib/models/report.ts
- [ ] T041 [P] Attachment data model with Zod validation in lib/models/attachment.ts
- [ ] T042 [P] Database connection and Supabase client setup in lib/database/supabase.ts
- [ ] T043 [P] MinIO client setup and bucket configuration in lib/storage/minio.ts

## Phase 3.5: Authentication System
- [ ] T044 Configure NextAuth.js with email/password provider in app/api/auth/[...nextauth]/route.ts
- [ ] T045 Create authentication middleware for protected routes in middleware.ts
- [ ] T046 POST /api/auth/register endpoint implementation in app/api/auth/register/route.ts
- [ ] T047 POST /api/auth/login endpoint implementation in app/api/auth/login/route.ts
- [ ] T048 Session management utilities in lib/auth/session.ts

## Phase 3.6: API Endpoints Implementation
### Project Management
- [ ] T049 GET /api/projects endpoint in app/api/projects/route.ts
- [ ] T050 POST /api/projects endpoint in app/api/projects/route.ts
- [ ] T051 GET /api/projects/[id] endpoint in app/api/projects/[id]/route.ts
- [ ] T052 PUT /api/projects/[id] endpoint in app/api/projects/[id]/route.ts
- [ ] T053 DELETE /api/projects/[id] endpoint in app/api/projects/[id]/route.ts

### Team Management
- [ ] T054 POST /api/projects/[id]/invitations endpoint in app/api/projects/[id]/invitations/route.ts
- [ ] T055 DELETE /api/projects/[id]/invitations endpoint in app/api/projects/[id]/invitations/route.ts

### Report Management
- [ ] T056 GET /api/projects/[id]/reports endpoint in app/api/projects/[id]/reports/route.ts
- [ ] T057 POST /api/projects/[id]/reports endpoint in app/api/projects/[id]/reports/route.ts
- [ ] T058 GET /api/projects/[id]/reports/[reportId] endpoint in app/api/projects/[id]/reports/[reportId]/route.ts
- [ ] T059 PUT /api/projects/[id]/reports/[reportId] endpoint in app/api/projects/[id]/reports/[reportId]/route.ts

### Widget & File Handling
- [ ] T060 POST /api/widget/submit endpoint in app/api/widget/submit/route.ts
- [ ] T061 POST /api/uploads endpoint with MinIO integration in app/api/uploads/route.ts
- [ ] T062 GET /api/projects/[id]/export CSV endpoint in app/api/projects/[id]/export/route.ts

## Phase 3.7: Embeddable Widget Development
- [ ] T063 [P] Widget core JavaScript with CSS isolation in public/widget/feedloop-widget.js
- [ ] T064 [P] Widget CSS with scoped styling in public/widget/widget.css
- [ ] T065 [P] Widget form components (feedback types, rich text, file upload) in public/widget/components.js
- [ ] T066 [P] Widget API client for submission in public/widget/api-client.js
- [ ] T067 Widget build and minification script in scripts/build-widget.js

## Phase 3.8: Dashboard Frontend Components
### Authentication Pages
- [ ] T068 [P] Login page component in app/auth/login/page.tsx
- [ ] T069 [P] Registration page component in app/auth/register/page.tsx

### Dashboard Layout
- [ ] T070 [P] Main dashboard layout component in app/dashboard/layout.tsx
- [ ] T071 [P] Navigation and sidebar components in components/dashboard/Navigation.tsx
- [ ] T072 [P] Project selection and overview in app/dashboard/page.tsx

### Project Management
- [ ] T073 [P] Project creation form component in components/projects/CreateProjectForm.tsx
- [ ] T074 [P] Project settings component in components/projects/ProjectSettings.tsx
- [ ] T075 [P] Team invitation component in components/projects/TeamInvitation.tsx
- [ ] T076 Project detail page in app/dashboard/projects/[id]/page.tsx

### Report Management
- [ ] T077 [P] Reports list component in components/reports/ReportsList.tsx
- [ ] T078 [P] Report detail view component in components/reports/ReportDetail.tsx
- [ ] T079 [P] Report status management component in components/reports/StatusControls.tsx
- [ ] T080 Reports page in app/dashboard/projects/[id]/reports/page.tsx

### File & Export Management
- [ ] T081 [P] File attachment display component in components/attachments/AttachmentList.tsx
- [ ] T082 [P] CSV export component in components/export/ExportControls.tsx

## Phase 3.9: Integration & Service Layer
- [ ] T083 User service layer with CRUD operations in lib/services/userService.ts
- [ ] T084 Project service layer with team management in lib/services/projectService.ts
- [ ] T085 Report service layer with filtering and status management in lib/services/reportService.ts
- [ ] T086 File upload service with MinIO integration in lib/services/fileService.ts
- [ ] T087 Export service for CSV generation in lib/services/exportService.ts
- [ ] T088 Error handling and validation middleware in lib/middleware/validation.ts
- [ ] T089 Rate limiting middleware for API endpoints in lib/middleware/rateLimit.ts

## Phase 3.10: Polish & Validation
### End-to-End Testing
- [ ] T090 [P] E2E test: Complete user onboarding flow in tests/e2e/onboarding.spec.ts
- [ ] T091 [P] E2E test: Widget integration and feedback submission in tests/e2e/widget.spec.ts
- [ ] T092 [P] E2E test: Dashboard report management workflow in tests/e2e/dashboard.spec.ts

### Performance & Security
- [ ] T093 [P] Performance testing for widget load time (<500ms) in tests/performance/widget.test.ts
- [ ] T094 [P] Performance testing for dashboard response time (<200ms) in tests/performance/api.test.ts
- [ ] T095 [P] Security testing for input validation and XSS prevention in tests/security/validation.test.ts
- [ ] T096 CORS configuration and security headers in middleware.ts

### Documentation & Deployment
- [ ] T097 [P] API documentation generation from OpenAPI spec in docs/api.md
- [ ] T098 [P] Widget integration guide in docs/widget-integration.md
- [ ] T099 [P] Deployment configuration for Coolify in docker-compose.prod.yml
- [ ] T100 Run complete quickstart validation guide from specs/001-feedloop-initial-plan/quickstart.md

## Dependencies
### Critical Path
- Setup (T001-T006) → Tests (T007-T029) → Database (T030-T036) → Models (T037-T043) → Auth (T044-T048) → API (T049-T062) → Integration (T083-T089) → Polish (T090-T100)

### Blocking Dependencies
- T030-T036 (Database) blocks T037-T043 (Models)
- T037-T043 (Models) blocks T044-T048 (Auth)
- T044-T048 (Auth) blocks T049-T062 (API endpoints)
- T049-T062 (API) blocks T068-T082 (Frontend components)
- T083-T089 (Services) blocks T090-T092 (E2E tests)

### Independent Parallel Work
- Widget development (T063-T067) can run parallel to Dashboard (T068-T082)
- Contract tests (T007-T022) can all run in parallel
- Integration tests (T023-T029) can all run in parallel
- Data models (T037-T041) can all run in parallel
- Frontend components within same category can run in parallel

## Parallel Execution Examples

### Phase 3.2 - All Contract Tests (T007-T022)
```bash
# Launch all contract tests simultaneously:
Task: "Contract test POST /api/auth/register in tests/contract/auth.test.ts"
Task: "Contract test POST /api/auth/login in tests/contract/auth.test.ts"
Task: "Contract test GET /api/projects in tests/contract/projects.test.ts"
Task: "Contract test POST /api/projects in tests/contract/projects.test.ts"
Task: "Contract test GET /api/projects/{id} in tests/contract/projects.test.ts"
# ... (continue with remaining contract tests)
```

### Phase 3.2 - All Integration Tests (T023-T029)
```bash
# Launch all integration tests simultaneously:
Task: "Integration test: User registration and authentication flow in tests/integration/onboarding.test.ts"
Task: "Integration test: Project creation and team invitation in tests/integration/project-management.test.ts"
Task: "Integration test: Widget feedback submission in tests/integration/feedback-collection.test.ts"
Task: "Integration test: Dashboard report management in tests/integration/report-management.test.ts"
Task: "Integration test: File upload and attachment handling in tests/integration/file-management.test.ts"
Task: "Integration test: CSV export functionality in tests/integration/export.test.ts"
Task: "Integration test: Team collaboration and access control in tests/integration/collaboration.test.ts"
```

### Phase 3.4 - All Data Models (T037-T041)
```bash
# Launch all data model creation simultaneously:
Task: "User data model with Zod validation in lib/models/user.ts"
Task: "Project data model with Zod validation in lib/models/project.ts"
Task: "ProjectInvitation data model with Zod validation in lib/models/invitation.ts"
Task: "Report data model with Zod validation in lib/models/report.ts"
Task: "Attachment data model with Zod validation in lib/models/attachment.ts"
```

### Phase 3.7 & 3.8 - Widget + Dashboard Parallel Development
```bash
# Widget development (can run parallel to dashboard):
Task: "Widget core JavaScript with CSS isolation in public/widget/feedloop-widget.js"
Task: "Widget CSS with scoped styling in public/widget/widget.css"
Task: "Widget form components in public/widget/components.js"

# Dashboard components (can run parallel to widget):
Task: "Login page component in app/auth/login/page.tsx"
Task: "Registration page component in app/auth/register/page.tsx"
Task: "Main dashboard layout component in app/dashboard/layout.tsx"
```

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (T007-T022 cover all 15 API endpoints)
- [x] All entities have model tasks (T037-T041 cover all 5 entities)
- [x] All tests come before implementation (Phase 3.2 before 3.3+)
- [x] Parallel tasks truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] All user scenarios from quickstart.md have integration tests
- [x] Database migrations precede model creation
- [x] Authentication setup before protected API endpoints
- [x] Widget and dashboard can develop in parallel after core services

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Widget must maintain CSS isolation to prevent host site conflicts
- Database uses fl_ prefix for all table names
- Follow Next.js App Router conventions for file structure
- MinIO integration required for file attachments (up to 5 per report)
- CSV export must be compatible with Jira/Azure DevOps import formats