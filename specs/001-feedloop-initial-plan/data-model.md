# Data Model: FeeDLooP MVP

**Date**: 2025-01-19
**Status**: Complete

## Entity Definitions

### fl_users
**Purpose**: Represents individuals using the platform
**Primary Key**: `id` (UUID)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password |
| name | VARCHAR(100) | NULL | User display name |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Validation Rules**:
- Email must be valid format
- Password minimum 8 characters
- Name maximum 100 characters

### fl_projects
**Purpose**: Container for feedback collection with unique integration
**Primary Key**: `id` (UUID)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL | Unique project identifier |
| name | VARCHAR(100) | NOT NULL | Project display name |
| owner_id | UUID | NOT NULL, FOREIGN KEY → fl_users.id | Project owner |
| integration_key | VARCHAR(50) | UNIQUE, NOT NULL | Unique widget integration key |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Project creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Validation Rules**:
- Name required, maximum 100 characters
- Integration key auto-generated, URL-safe
- Owner must be valid user

### fl_project_invitations
**Purpose**: Manages user access to projects with role-based permissions
**Primary Key**: `id` (UUID)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL | Unique invitation identifier |
| project_id | UUID | NOT NULL, FOREIGN KEY → fl_projects.id | Associated project |
| user_id | UUID | NOT NULL, FOREIGN KEY → fl_users.id | Invited user |
| role | ENUM | NOT NULL, DEFAULT 'member' | User role (owner, member) |
| can_invite | BOOLEAN | NOT NULL, DEFAULT FALSE | Permission to invite others |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Invitation creation time |

**Validation Rules**:
- Unique constraint on (project_id, user_id)
- Role must be 'owner' or 'member'
- Only owners can set can_invite permission

### fl_reports
**Purpose**: Individual feedback submission with metadata
**Primary Key**: `id` (UUID)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL | Unique report identifier |
| project_id | UUID | NOT NULL, FOREIGN KEY → fl_projects.id | Associated project |
| type | ENUM | NOT NULL | Report type (bug, initiative, feedback) |
| title | VARCHAR(200) | NOT NULL | Report title/summary |
| description | TEXT | NOT NULL | Detailed description (max 1000 words) |
| status | ENUM | NOT NULL, DEFAULT 'active' | Report status (active, archived) |
| priority | ENUM | NULL | Priority level (low, medium, high, critical) |
| reporter_email | VARCHAR(255) | NULL | Email of feedback submitter |
| reporter_name | VARCHAR(100) | NULL | Name of feedback submitter |
| url | TEXT | NULL | Page URL where feedback was submitted |
| user_agent | TEXT | NULL | Browser/device information |
| console_logs | JSON | NULL | Browser console logs (for bugs) |
| network_requests | JSON | NULL | Network request logs (for bugs) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Report submission time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Validation Rules**:
- Type must be 'bug', 'initiative', or 'feedback'
- Status must be 'active' or 'archived'
- Description maximum 1000 words
- Priority optional, defaults to NULL
- Diagnostic data (console_logs, network_requests) only for bug reports

### fl_attachments
**Purpose**: Files associated with reports (images, documents)
**Primary Key**: `id` (UUID)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL | Unique attachment identifier |
| report_id | UUID | NOT NULL, FOREIGN KEY → fl_reports.id | Associated report |
| filename | VARCHAR(255) | NOT NULL | Original filename |
| file_path | VARCHAR(500) | NOT NULL | Storage path in MinIO |
| file_size | BIGINT | NOT NULL | File size in bytes |
| mime_type | VARCHAR(100) | NOT NULL | File MIME type |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Upload time |

**Validation Rules**:
- Maximum 5 attachments per report
- Supported file types: PNG, JPG, GIF, PDF, XLSX, XLS, DOCX, DOC
- Maximum file size: 10MB per attachment
- Filename sanitization required

## Entity Relationships

### fl_users ↔ fl_projects (Many-to-Many via fl_project_invitations)
- Users can be associated with multiple projects
- Projects can have multiple users
- Relationship managed through fl_project_invitations entity
- Includes role and permission information

### fl_projects → fl_reports (One-to-Many)
- Each project can have unlimited reports
- Each report belongs to exactly one project
- Reports are deleted when project is deleted (CASCADE)

### fl_reports → fl_attachments (One-to-Many)
- Each report can have up to 5 attachments
- Each attachment belongs to exactly one report
- Attachments are deleted when report is deleted (CASCADE)

## State Transitions

### Report Status Lifecycle
```
[NEW] → active → archived
            ↕
        (can be restored)
```

### Project Invitation Lifecycle
```
[CREATED] → active → [DELETED]
```

## Database Indexes

### Performance Indexes
```sql
-- Query optimization for dashboard
CREATE INDEX idx_fl_reports_project_status ON fl_reports(project_id, status);
CREATE INDEX idx_fl_reports_created_at ON fl_reports(created_at DESC);

-- User project access
CREATE INDEX idx_fl_project_invitations_user_project ON fl_project_invitations(user_id, project_id);

-- File cleanup operations
CREATE INDEX idx_fl_attachments_report ON fl_attachments(report_id);
```

### Unique Constraints
```sql
-- Prevent duplicate invitations
ALTER TABLE fl_project_invitations ADD CONSTRAINT unique_user_project
UNIQUE(user_id, project_id);

-- Ensure unique integration keys
ALTER TABLE fl_projects ADD CONSTRAINT unique_integration_key
UNIQUE(integration_key);
```

## Row Level Security (RLS) Policies

### Project Access Control
```sql
-- Users can only access projects they're invited to
CREATE POLICY project_access ON fl_projects
FOR ALL TO authenticated
USING (
  id IN (
    SELECT project_id FROM fl_project_invitations
    WHERE user_id = auth.uid()
  )
);
```

### Report Access Control
```sql
-- Users can only access reports from their projects
CREATE POLICY report_access ON fl_reports
FOR ALL TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM fl_project_invitations
    WHERE user_id = auth.uid()
  )
);
```

### Attachment Access Control
```sql
-- Users can only access attachments from their reports
CREATE POLICY attachment_access ON fl_attachments
FOR ALL TO authenticated
USING (
  report_id IN (
    SELECT r.id FROM fl_reports r
    JOIN fl_project_invitations pi ON r.project_id = pi.project_id
    WHERE pi.user_id = auth.uid()
  )
);
```

## Data Validation Schema (Zod)

### Report Creation Schema
```typescript
const ReportCreateSchema = z.object({
  type: z.enum(['bug', 'initiative', 'feedback']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000), // ~1000 words
  reporter_email: z.string().email().optional(),
  reporter_name: z.string().max(100).optional(),
  url: z.string().url().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    size: z.number().max(10 * 1024 * 1024), // 10MB
    type: z.string()
  })).max(5)
});
```

### Project Schema
```typescript
const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(100)
});

const ProjectInvitationSchema = z.object({
  email: z.string().email(),
  can_invite: z.boolean().default(false)
});
```

## Migration Strategy

### Phase 1: Core Tables
1. Create fl_users table
2. Create fl_projects table
3. Create fl_project_invitations table
4. Set up basic RLS policies

### Phase 2: Feedback System
1. Create fl_reports table
2. Create fl_attachments table
3. Add indexes for performance
4. Set up advanced RLS policies

### Phase 3: Optimizations
1. Add composite indexes
2. Set up triggers for updated_at
3. Add constraint validations
4. Performance monitoring setup