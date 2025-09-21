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

## Phase 3.2: Tests First (TDD) ✅ COMPLETED
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)
- [x] T007 [P] Contract test POST /api/auth/register in tests/contract/auth.test.ts ✅ COMPLETED
- [x] T008 [P] Contract test POST /api/auth/login in tests/contract/auth.test.ts ✅ COMPLETED
- [x] T009 [P] Contract test GET /api/projects in tests/contract/projects.test.ts ✅ COMPLETED
- [x] T010 [P] Contract test POST /api/projects in tests/contract/projects.test.ts ✅ COMPLETED
- [x] T011 [P] Contract test GET /api/projects/{id} in tests/contract/projects.test.ts ✅ COMPLETED
- [x] T012 [P] Contract test PUT /api/projects/{id} in tests/contract/projects.test.ts ✅ COMPLETED
- [x] T013 [P] Contract test DELETE /api/projects/{id} in tests/contract/projects.test.ts ✅ COMPLETED
- [x] T014 [P] Contract test POST /api/projects/{id}/invitations in tests/contract/invitations.test.ts ✅ COMPLETED
- [x] T015 [P] Contract test DELETE /api/projects/{id}/invitations in tests/contract/invitations.test.ts ✅ COMPLETED
- [x] T016 [P] Contract test GET /api/projects/{id}/reports in tests/contract/reports.test.ts ✅ COMPLETED
- [x] T017 [P] Contract test POST /api/projects/{id}/reports in tests/contract/reports.test.ts ✅ COMPLETED
- [x] T018 [P] Contract test GET /api/projects/{id}/reports/{id} in tests/contract/reports.test.ts ✅ COMPLETED
- [x] T019 [P] Contract test PUT /api/projects/{id}/reports/{id} in tests/contract/reports.test.ts ✅ COMPLETED
- [x] T020 [P] Contract test POST /api/widget/submit in tests/contract/widget.test.ts ✅ COMPLETED
- [x] T021 [P] Contract test POST /api/uploads in tests/contract/uploads.test.ts ✅ COMPLETED
- [x] T022 [P] Contract test GET /api/projects/{id}/export in tests/contract/export.test.ts ✅ COMPLETED

### Integration Tests (User Scenarios)
- [x] T023 [P] Integration test: User registration and authentication flow in tests/integration/onboarding.test.ts ✅ COMPLETED
- [x] T024 [P] Integration test: Project creation and team invitation in tests/integration/project-management.test.ts ✅ COMPLETED
- [x] T025 [P] Integration test: Widget feedback submission (bug, initiative, feedback) in tests/integration/feedback-collection.test.ts ✅ COMPLETED
- [x] T026 [P] Integration test: Dashboard report management and status updates in tests/integration/report-management.test.ts ✅ COMPLETED
- [x] T027 [P] Integration test: File upload and attachment handling in tests/integration/file-management.test.ts ✅ COMPLETED
- [x] T028 [P] Integration test: CSV export functionality in tests/integration/export.test.ts ✅ COMPLETED
- [x] T029 [P] Integration test: Team collaboration and access control in tests/integration/collaboration.test.ts ✅ COMPLETED

## Phase 3.3: Database Setup ✅ COMPLETED
**Note**: Database setup provided as complete script in `product_documentation/DATABASE_DOCUMENTATION.sql`
- [x] T030 Create Supabase migration for fl_users table (included in DATABASE_DOCUMENTATION.sql)
- [x] T031 Create Supabase migration for fl_projects table (included in DATABASE_DOCUMENTATION.sql)
- [x] T032 Create Supabase migration for fl_project_invitations table (included in DATABASE_DOCUMENTATION.sql)
- [x] T033 Create Supabase migration for fl_reports table (included in DATABASE_DOCUMENTATION.sql)
- [x] T034 Create Supabase migration for fl_attachments table (included in DATABASE_DOCUMENTATION.sql)
- [x] T035 Create RLS policies for all tables (included in DATABASE_DOCUMENTATION.sql)
- [x] T036 Create database indexes for performance (included in DATABASE_DOCUMENTATION.sql)

## Phase 3.4: Core Data Models ✅ COMPLETED
- [x] T037 [P] User data model with Zod validation in lib/models/user.ts ✅ COMPLETED
- [x] T038 [P] Project data model with Zod validation in lib/models/project.ts ✅ COMPLETED
- [x] T039 [P] ProjectInvitation data model with Zod validation in lib/models/invitation.ts ✅ COMPLETED
- [x] T040 [P] Report data model with Zod validation in lib/models/report.ts ✅ COMPLETED
- [x] T041 [P] Attachment data model with Zod validation in lib/models/attachment.ts ✅ COMPLETED
- [x] T042 [P] Database connection and Supabase client setup in lib/database/supabase.ts ✅ COMPLETED
- [x] T043 [P] MinIO client setup and bucket configuration in lib/storage/minio.ts ✅ COMPLETED

## Phase 3.5: Authentication System ✅ COMPLETED
- [x] T044 Configure NextAuth.js with email/password provider in app/api/auth/[...nextauth]/route.ts ✅ COMPLETED
- [x] T045 Create authentication middleware for protected routes in middleware.ts ✅ COMPLETED
- [x] T046 POST /api/auth/register endpoint implementation in app/api/auth/register/route.ts ✅ COMPLETED
- [x] T047 POST /api/auth/login endpoint implementation in app/api/auth/login/route.ts ✅ COMPLETED
- [x] T048 Session management utilities in lib/auth/session.ts ✅ COMPLETED

## Phase 3.6: API Endpoints Implementation ✅ COMPLETED
### Project Management
- [x] T049 GET /api/projects endpoint in app/api/projects/route.ts ✅ COMPLETED
- [x] T050 POST /api/projects endpoint in app/api/projects/route.ts ✅ COMPLETED
- [x] T051 GET /api/projects/[id] endpoint in app/api/projects/[id]/route.ts ✅ COMPLETED
- [x] T052 PUT /api/projects/[id] endpoint in app/api/projects/[id]/route.ts ✅ COMPLETED
- [x] T053 DELETE /api/projects/[id] endpoint in app/api/projects/[id]/route.ts ✅ COMPLETED

### Team Management
- [x] T054 POST /api/projects/[id]/invitations endpoint in app/api/projects/[id]/invitations/route.ts ✅ COMPLETED
- [x] T055 DELETE /api/projects/[id]/invitations endpoint in app/api/projects/[id]/invitations/route.ts ✅ COMPLETED

### Report Management
- [x] T056 GET /api/projects/[id]/reports endpoint in app/api/projects/[id]/reports/route.ts ✅ COMPLETED
- [x] T057 POST /api/projects/[id]/reports endpoint in app/api/projects/[id]/reports/route.ts ✅ COMPLETED
- [x] T058 GET /api/projects/[id]/reports/[reportId] endpoint in app/api/projects/[id]/reports/[reportId]/route.ts ✅ COMPLETED
- [x] T059 PUT /api/projects/[id]/reports/[reportId] endpoint in app/api/projects/[id]/reports/[reportId]/route.ts ✅ COMPLETED

### Widget & File Handling
- [x] T060 POST /api/widget/submit endpoint in app/api/widget/submit/route.ts ✅ COMPLETED (with 10MB body limit & compression)
- [x] T061 POST /api/uploads endpoint with MinIO integration in app/api/uploads/route.ts ✅ COMPLETED
- [x] T062 GET /api/projects/[id]/export CSV endpoint in app/api/projects/[id]/export/route.ts

## Phase 3.7: Embeddable Widget Development ✅ COMPLETED
- [x] T063 [P] Widget core JavaScript with CSS isolation in public/widget/feedloop-widget.js ✅ COMPLETED (with production CDN detection)
- [x] T064 [P] Widget CSS with scoped styling in public/widget/widget.css ✅ COMPLETED (converted to inline styles)
- [x] T065 [P] Widget form components (feedback types, rich text, file upload) in public/widget/components.js ✅ COMPLETED (integrated in main file)
- [x] T066 [P] Widget API client for submission in public/widget/api-client.js ✅ COMPLETED (with compression & endpoint detection)
- [x] T067 Widget build and minification script in scripts/build-widget.js ✅ COMPLETED (with integrity hashes)

## Phase 3.8: Dashboard Frontend Components ✅ COMPLETED
### Authentication Pages
- [x] T068 [P] Login page component in app/auth/login/page.tsx ✅ COMPLETED
- [x] T069 [P] Registration page component in app/auth/register/page.tsx ✅ COMPLETED

### Dashboard Layout
- [x] T070 [P] Main dashboard layout component in app/dashboard/layout.tsx ✅ COMPLETED
- [x] T071 [P] Navigation and sidebar components in components/dashboard/Navigation.tsx ✅ COMPLETED
- [x] T072 [P] Project selection and overview in app/dashboard/page.tsx ✅ COMPLETED

### Project Management
- [x] T073 [P] Project creation form component in components/projects/CreateProjectForm.tsx ✅ COMPLETED
- [x] T074 [P] Project settings component in components/projects/ProjectSettings.tsx ✅ COMPLETED
- [x] T075 [P] Team invitation component in components/projects/TeamInvitation.tsx ✅ COMPLETED
- [x] T076 Project detail page in app/dashboard/projects/[id]/page.tsx ✅ COMPLETED

### Report Management
- [x] T077 [P] Reports list component in components/reports/ReportsList.tsx ✅ COMPLETED
- [x] T078 [P] Report detail view component in components/reports/ReportDetail.tsx ✅ COMPLETED
- [x] T079 [P] Report status management component in components/reports/StatusControls.tsx ✅ COMPLETED
- [x] T080 Reports page in app/dashboard/projects/[id]/reports/page.tsx ✅ COMPLETED

### File & Export Management
- [x] T081 [P] File attachment display component in components/attachments/AttachmentList.tsx ✅ COMPLETED
- [x] T082 [P] CSV export component in components/export/ExportControls.tsx ✅ COMPLETED

## Phase 3.9: Integration & Service Layer
- [x] T083 User service layer with CRUD operations in lib/services/userService.ts
- [x] T084 Project service layer with team management in lib/services/projectService.ts
- [x] T085 Report service layer with filtering and status management in lib/services/reportService.ts
- [x] T086 File upload service with MinIO integration in lib/services/fileService.ts
- [x] T087 Export service for CSV generation in lib/services/exportService.ts
- [x] T088 Error handling and validation middleware in lib/middleware/validation.ts
- [x] T089 Rate limiting middleware for API endpoints in lib/middleware/rateLimit.ts

## Phase 3.10: Polish & Validation ✅ COMPLETED
### End-to-End Testing
- [x] T090 [P] E2E test: Complete user onboarding flow in tests/e2e/authentication.spec.ts ✅ COMPLETED
- [x] T091 [P] E2E test: Widget integration and feedback submission in tests/e2e/widget-integration.spec.ts ✅ COMPLETED
- [x] T092 [P] E2E test: Dashboard report management workflow in tests/e2e/dashboard-core.spec.ts ✅ COMPLETED

### Performance & Security
- [x] T093 [P] Performance testing for widget load time (<500ms) in tests/performance/widget-basic.test.js ✅ COMPLETED
- [x] T094 [P] Performance testing for dashboard response time (<200ms) in tests/performance/dashboard-performance.test.js ✅ COMPLETED
- [x] T095 [P] Security testing for input validation and XSS prevention in tests/security/input-validation.test.js ✅ COMPLETED
- [x] T096 CORS configuration and security headers in middleware.ts ✅ COMPLETED

### Documentation & Deployment
- [x] T097 [P] API documentation generation from OpenAPI spec in docs/api-specification.yaml ✅ COMPLETED
- [x] T098 [P] Widget integration guide in docs/FRAMEWORK_INTEGRATION.md ✅ COMPLETED
- [x] T099 [P] Deployment configuration for Coolify in .coolify.yaml and docs/COOLIFY_DEPLOYMENT.md ✅ COMPLETED
- [x] T100 Run complete quickstart validation guide from specs/001-feedloop-initial-plan/quickstart.md ✅ COMPLETED

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