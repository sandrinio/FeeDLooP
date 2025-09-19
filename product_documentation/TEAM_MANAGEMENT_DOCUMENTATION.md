# 👥 FeeDLooP Team Management Documentation

> **Version**: 1.0.0 (Enhanced Invitation System)
> **Last Updated**: December 2024
> **Status**: Production Ready

## 📖 Table of Contents

1. [Overview](#overview)
2. [Enhanced Invitation System](#enhanced-invitation-system)
3. [Team Member Types](#team-member-types)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Frontend Components](#frontend-components)
7. [Security & Permissions](#security--permissions)
8. [Email-Based Invitation Workflow](#email-based-invitation-workflow)
9. [Testing Guide](#testing-guide)
10. [Troubleshooting](#troubleshooting)
11. [Code Examples](#code-examples)

---

## Overview

FeeDLooP's team management system enables project owners and administrators to invite team members, manage permissions, and collaborate on feedback collection projects. The system supports both **existing users** (immediate access) and **non-registered users** (email-based invitations with automatic access upon registration).

### Key Features

- ✅ **Email-Based Invitations**: Invite anyone by email, whether registered or not
- ✅ **Dual User Support**: Existing users get immediate access, new users get pending invitations
- ✅ **Role-Based Access**: Owner, member roles with granular permissions
- ✅ **Automatic Processing**: Pending invitations automatically processed during registration
- ✅ **Secure Tokens**: 7-day expiring invitation tokens with unique constraints
- ✅ **Visual Indicators**: Clear UI distinction between active and pending members
- ✅ **Unified Management**: Single interface for managing both types of invitations

### System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Project Owner │    │   Existing User  │    │   New User      │
│                 │    │                  │    │                 │
│ Sends Invitation│───▶│ Immediate Access │    │ Pending Status  │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │   Registration  │
                                               │                 │
                                               │ Auto-Processing │
                                               │                 │
                                               └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │  Project Access │
                                               │                 │
                                               │  Welcome Message│
                                               │                 │
                                               └─────────────────┘
```

---

## Enhanced Invitation System

### System Transformation

The invitation system has evolved from a "user lookup" model to a comprehensive "email-based invitation workflow":

#### Before (Basic System)
- ❌ Could only invite existing registered users
- ❌ "User not found" errors for new users
- ❌ Manual user registration required before invitation

#### After (Enhanced System)
- ✅ Invite anyone by email address
- ✅ Automatic project access upon registration
- ✅ Pending invitation management
- ✅ Seamless onboarding experience

### Invitation Types

| Type | User Status | Access | Database Table | Visual Indicator |
|------|-------------|--------|----------------|------------------|
| **Active** | Registered | Immediate | `fl_project_invitations` | Green checkmark |
| **Pending** | Not Registered | Upon Registration | `fl_pending_invitations` | Orange question mark + "Pending" badge |

---

## Team Member Types

### User Roles

#### 🔸 **Owner**
- **Permissions**: Full project control
- **Can Do**:
  - ✅ Invite/remove team members
  - ✅ Update project settings
  - ✅ Delete project
  - ✅ Manage all reports
  - ✅ Export data
- **Limitation**: Cannot be removed from project
- **Creation**: Automatically assigned during project creation

#### 🔸 **Member**
- **Permissions**: Standard team access
- **Can Do**:
  - ✅ View project reports
  - ✅ Create/edit reports
  - ✅ Manage own reports
  - ✅ View team members
- **Limitation**: Cannot invite others (unless `can_invite` is true)
- **Creation**: Via invitation from owner/admin

#### 🔸 **Member with Invite Permissions**
- **Permissions**: Member + invitation rights
- **Can Do**:
  - ✅ All member permissions
  - ✅ Invite new team members
  - ✅ Remove team members (except owner)
- **Limitation**: Cannot delete project or change owner
- **Creation**: Owner can grant `can_invite` permission

### Permission Matrix

| Action | Owner | Member | Member + Invite |
|--------|-------|--------|-----------------|
| View Reports | ✅ | ✅ | ✅ |
| Create Reports | ✅ | ✅ | ✅ |
| Edit Own Reports | ✅ | ✅ | ✅ |
| Edit All Reports | ✅ | ❌ | ❌ |
| View Team | ✅ | ✅ | ✅ |
| Invite Members | ✅ | ❌ | ✅ |
| Remove Members | ✅ | ❌ | ✅ |
| Update Project | ✅ | ❌ | ❌ |
| Delete Project | ✅ | ❌ | ❌ |
| Export Data | ✅ | ❌ | ❌ |

---

## API Endpoints

### 📧 Send Invitation
```http
POST /api/projects/{projectId}/invitations
```

**Enhanced Behavior**: Automatically detects if user exists and creates appropriate invitation type.

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "member",
  "can_invite": false
}
```

**Response for Existing User (201 Created):**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "user_id": "uuid",
  "email": "existing@example.com",
  "role": "member",
  "can_invite": false,
  "status": "active",
  "created_at": "2024-12-19T00:00:00Z",
  "message": "User added to project successfully"
}
```

**Response for Non-Existing User (201 Created):**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "email": "newuser@example.com",
  "role": "member",
  "can_invite": false,
  "status": "pending",
  "expires_at": "2024-12-26T00:00:00Z",
  "invitation_token": "secure-64-char-token",
  "created_at": "2024-12-19T00:00:00Z",
  "message": "Invitation sent to newuser@example.com. They will be added to the project when they register."
}
```

### 👥 Get Team Members
```http
GET /api/projects/{projectId}
```

**Enhanced Response**: Returns unified list of active members and pending invitations.

**Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "My Project",
  "owner_id": "uuid",
  "integration_key": "flp_xxxxxxxxxxxxx",
  "created_at": "2024-12-19T00:00:00Z",
  "members": [
    {
      "user_id": "uuid",
      "email": "owner@example.com",
      "name": "John Doe",
      "role": "owner",
      "can_invite": true,
      "status": "active",
      "created_at": "2024-12-19T00:00:00Z"
    },
    {
      "user_id": "uuid",
      "email": "member@example.com",
      "name": "Jane Smith",
      "role": "member",
      "can_invite": false,
      "status": "active",
      "created_at": "2024-12-19T00:00:00Z"
    },
    {
      "invitation_id": "uuid",
      "email": "pending@example.com",
      "name": null,
      "role": "member",
      "can_invite": false,
      "status": "pending",
      "expires_at": "2024-12-26T00:00:00Z",
      "created_at": "2024-12-19T00:00:00Z"
    }
  ]
}
```

### ❌ Remove Team Member/Cancel Invitation
```http
DELETE /api/projects/{projectId}/invitations
```

**Enhanced Payload**: Supports both active members and pending invitations.

**For Active Member:**
```json
{
  "user_id": "uuid"
}
```

**For Pending Invitation:**
```json
{
  "invitation_id": "uuid",
  "is_pending": true
}
```

**Response:**
- `204 No Content` - Success
- `403 Forbidden` - No permission
- `404 Not Found` - Member/invitation not found

### 🔄 Update Member Role
```http
PUT /api/projects/{projectId}/invitations/{userId}
```

**Request Body:**
```json
{
  "role": "member",
  "can_invite": true
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "role": "member",
  "can_invite": true,
  "updated_at": "2024-12-19T00:00:00Z"
}
```

---

## Database Schema

### Core Tables

#### 🗄️ **fl_project_invitations** (Active Members)
```sql
CREATE TABLE fl_project_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES fl_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES fl_users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'member',
    can_invite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);
```

#### 🗄️ **fl_pending_invitations** (Pending Members)
```sql
CREATE TABLE fl_pending_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES fl_projects(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    can_invite BOOLEAN NOT NULL DEFAULT FALSE,
    invited_by UUID NOT NULL REFERENCES fl_users(id) ON DELETE CASCADE,
    invitation_token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(email, project_id)
);
```

### Database Functions

#### 🔧 **fl_process_pending_invitations()**
**Purpose**: Automatically converts pending invitations to active memberships during user registration.

**Trigger**: `AFTER INSERT ON fl_users`

**Logic**:
1. Find all pending invitations for the new user's email
2. Create `fl_project_invitations` entries for each pending invitation
3. Mark pending invitations as accepted
4. Return user data with processed invitations

#### 🔧 **fl_get_project_invitations(UUID)**
**Purpose**: Returns unified view of active members and pending invitations for a project.

**Usage**:
```sql
SELECT * FROM fl_get_project_invitations('project-uuid');
```

**Returns**:
```sql
-- Active members
SELECT
    pi.id, u.email, (u.first_name || ' ' || u.last_name) as name,
    pi.role, pi.can_invite, 'active' as status, pi.created_at, pi.user_id
FROM fl_project_invitations pi
JOIN fl_users u ON pi.user_id = u.id
WHERE pi.project_id = project_id

UNION ALL

-- Pending invitations
SELECT
    pend.id, pend.email, NULL as name,
    pend.role, pend.can_invite, 'pending' as status, pend.created_at, NULL as user_id
FROM fl_pending_invitations pend
WHERE pend.project_id = project_id
  AND pend.expires_at > NOW()
  AND pend.accepted_at IS NULL;
```

#### 🔧 **fl_cleanup_expired_invitations()**
**Purpose**: Removes expired pending invitations.

**Usage**: Should be called periodically via cron job.

```sql
SELECT fl_cleanup_expired_invitations(); -- Returns count of deleted invitations
```

### Indexes for Performance

```sql
-- Active invitations optimization
CREATE INDEX idx_fl_project_invitations_user_project ON fl_project_invitations(user_id, project_id);
CREATE INDEX idx_fl_project_invitations_project ON fl_project_invitations(project_id);

-- Pending invitations optimization
CREATE INDEX idx_fl_pending_invitations_email ON fl_pending_invitations(email);
CREATE INDEX idx_fl_pending_invitations_project ON fl_pending_invitations(project_id);
CREATE INDEX idx_fl_pending_invitations_token ON fl_pending_invitations(invitation_token);
CREATE INDEX idx_fl_pending_invitations_expires_at ON fl_pending_invitations(expires_at);
CREATE INDEX idx_fl_pending_invitations_project_status ON fl_pending_invitations(project_id, accepted_at);
```

---

## Frontend Components

### 🎨 **Team Management Page**
**Location**: `/app/dashboard/projects/[id]/team/page.tsx`

**Key Features**:
- Unified display of active and pending members
- Visual status indicators (active vs pending)
- Invite form with email validation
- Remove/cancel functionality for both types
- Role management interface

**TypeScript Interface**:
```typescript
interface TeamMember {
  user_id: string | null           // null for pending invitations
  invitation_id?: string           // only for pending invitations
  email: string
  name: string | null              // null for pending invitations
  role: 'owner' | 'member' | 'admin'
  can_invite: boolean
  status: 'active' | 'pending'
  expires_at?: string              // only for pending invitations
  created_at?: string
}
```

**State Management**:
```typescript
const [members, setMembers] = useState<TeamMember[]>([])
const [isInviting, setIsInviting] = useState(false)
const [inviteForm, setInviteForm] = useState({
  email: '',
  role: 'member' as 'member' | 'admin',
  can_invite: false
})
```

### 🎨 **Invitation Form Component**
**Features**:
- Email validation with regex
- Role selection (member/admin)
- Permission toggles
- Loading states
- Success/error feedback

**Form Validation**:
```typescript
const validateEmail = (email: string) => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  return emailRegex.test(email)
}

const validateForm = () => {
  if (!validateEmail(inviteForm.email)) {
    setError('Please enter a valid email address')
    return false
  }
  return true
}
```

### 🎨 **Member List Component**
**Features**:
- Avatar placeholders (green checkmark for active, orange question mark for pending)
- Role badges with color coding
- "Pending" status indicators
- Expiration date display for pending invitations
- Context menus for actions (edit role, remove)

**Visual Indicators**:
```tsx
const MemberAvatar = ({ member }: { member: TeamMember }) => {
  if (member.status === 'pending') {
    return (
      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
        <QuestionMarkCircleIcon className="w-6 h-6 text-orange-600" />
      </div>
    )
  }

  return (
    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
      <CheckCircleIcon className="w-6 h-6 text-green-600" />
    </div>
  )
}
```

---

## Security & Permissions

### 🔒 Row Level Security (RLS)

**fl_project_invitations Policy**:
```sql
CREATE POLICY invitation_access ON fl_project_invitations
FOR ALL TO authenticated
USING (
    project_id IN (
        SELECT project_id FROM fl_project_invitations
        WHERE user_id = auth.uid()
    )
);
```

**fl_pending_invitations Policy**:
```sql
CREATE POLICY pending_invitation_access ON fl_pending_invitations
FOR ALL TO authenticated
USING (
    project_id IN (
        SELECT project_id FROM fl_project_invitations
        WHERE user_id = auth.uid()
    )
);
```

### 🔒 API Security Checks

**Permission Validation**:
```typescript
// Check if user can invite others
const canInvite = async (userId: string, projectId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('fl_project_invitations')
    .select('role, can_invite')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single()

  return data?.role === 'owner' || data?.can_invite === true
}

// Check if user can remove members
const canRemoveMember = async (userId: string, projectId: string, targetUserId: string): Promise<boolean> => {
  const userRole = await getUserRole(userId, projectId)
  const targetRole = await getUserRole(targetUserId, projectId)

  // Owners can remove anyone except themselves
  if (userRole === 'owner' && targetRole !== 'owner') return true

  // Members with invite permission can remove other members
  if (userRole === 'member' && await hasInvitePermission(userId, projectId) && targetRole === 'member') return true

  return false
}
```

### 🔒 Token Security

**Invitation Token Generation**:
```sql
-- Secure 64-character token
DEFAULT substring(replace(uuid_generate_v4()::text, '-', '') || replace(uuid_generate_v4()::text, '-', ''), 1, 64)
```

**Token Validation**:
- Unique constraint prevents duplicate tokens
- 7-day expiration automatically enforced
- Cannot be reused after acceptance
- Securely generated with UUID entropy

---

## Email-Based Invitation Workflow

### 📧 Complete User Journey

#### **Step 1: Project Owner Sends Invitation**
```typescript
// Owner invites new user
const inviteUser = async (email: string, role: string) => {
  const response = await fetch(`/api/projects/${projectId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role, can_invite: false })
  })

  const result = await response.json()

  if (result.status === 'pending') {
    showMessage(`Invitation sent to ${email}. They'll get access when they register.`)
  } else {
    showMessage(`${email} has been added to the project.`)
  }
}
```

#### **Step 2: System Processing**
```sql
-- API checks if user exists
SELECT id FROM fl_users WHERE email = $1;

-- If user exists -> Create immediate invitation
INSERT INTO fl_project_invitations (project_id, user_id, role, can_invite)
VALUES ($1, $2, $3, $4);

-- If user doesn't exist -> Create pending invitation
INSERT INTO fl_pending_invitations (project_id, email, role, can_invite, invited_by)
VALUES ($1, $2, $3, $4, $5);
```

#### **Step 3: User Registration**
```typescript
// User registers with invited email
const register = async (email: string, password: string, firstName: string, lastName: string, company: string) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName, company })
  })

  const result = await response.json()

  // Check if user had pending invitations
  if (result.processed_invitations && result.processed_invitations.length > 0) {
    showWelcomeMessage(`Welcome! You've been added to ${result.processed_invitations.length} project(s).`)
  }
}
```

#### **Step 4: Automatic Processing (Database Trigger)**
```sql
-- Trigger function automatically runs after user creation
CREATE TRIGGER process_pending_invitations_on_register
    AFTER INSERT ON fl_users
    FOR EACH ROW EXECUTE FUNCTION fl_process_pending_invitations();

-- Function logic:
-- 1. Find pending invitations for user's email
-- 2. Create active project invitations
-- 3. Mark pending invitations as accepted
-- 4. User gets immediate project access
```

#### **Step 5: Welcome Experience**
```typescript
// Enhanced registration response
interface RegistrationResponse {
  user: User
  message: string
  processed_invitations?: Array<{
    project_id: string
    project_name: string
    role: string
  }>
}

// Display welcome message with project information
const showWelcomeMessage = (invitations: ProcessedInvitation[]) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-blue-900">Welcome to FeeDLooP!</h3>
      <p className="text-blue-700 mt-2">You've been automatically added to:</p>
      <ul className="mt-2 space-y-1">
        {invitations.map(inv => (
          <li key={inv.project_id} className="text-blue-600">
            • {inv.project_name} (as {inv.role})
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### 📧 Invitation States

| State | Description | User Action | System Response |
|-------|-------------|-------------|-----------------|
| **Sent** | Invitation created for non-registered user | None | Pending invitation stored in database |
| **Pending** | Waiting for user registration | User sees "pending" in team list | Invitation visible to project team |
| **Expired** | 7 days passed without registration | Invitation automatically removed | No longer visible, can re-invite |
| **Accepted** | User registered and gained access | User has project access | Converted to active membership |
| **Cancelled** | Project owner cancelled before acceptance | Invitation removed from database | No longer visible |

---

## Testing Guide

### 🧪 E2E Testing Strategy

**Test File**: `/tests/e2e/enhanced-invitation-system.spec.ts`

**Test Coverage**:
1. ✅ Owner registration and project creation
2. ✅ Inviting existing users (immediate access)
3. ✅ Inviting non-existing users (pending status)
4. ✅ New user registration with automatic invitation processing
5. ✅ Team member removal
6. ✅ UI state verification (active vs pending indicators)

**Test Data Structure**:
```typescript
const TEST_USERS = {
  owner: {
    email: `owner.${Date.now()}@feedloop.test`,
    password: 'TestPassword123!',
    firstName: 'Project',
    lastName: 'Owner',
    company: 'Test Company'
  },
  existingUser: {
    email: `existing.${Date.now()}@feedloop.test`,
    password: 'TestPassword123!',
    firstName: 'Existing',
    lastName: 'User',
    company: 'Test Company'
  },
  newUser: {
    email: `newuser.${Date.now()}@feedloop.test`,
    password: 'TestPassword123!',
    firstName: 'New',
    lastName: 'User',
    company: 'Test Company'
  }
}
```

### 🧪 Unit Testing

**API Endpoint Tests**:
```typescript
describe('Team Management API', () => {
  test('should invite existing user immediately', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/invitations`)
      .send({ email: 'existing@test.com', role: 'member' })
      .expect(201)

    expect(response.body.status).toBe('active')
    expect(response.body.user_id).toBeDefined()
  })

  test('should create pending invitation for new user', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/invitations`)
      .send({ email: 'newuser@test.com', role: 'member' })
      .expect(201)

    expect(response.body.status).toBe('pending')
    expect(response.body.invitation_token).toBeDefined()
    expect(response.body.expires_at).toBeDefined()
  })
})
```

**Database Function Tests**:
```sql
-- Test automatic invitation processing
BEGIN;
  -- Create pending invitation
  INSERT INTO fl_pending_invitations (project_id, email, role, invited_by)
  VALUES ('test-project-id', 'test@example.com', 'member', 'inviter-id');

  -- Simulate user registration
  INSERT INTO fl_users (email, password_hash, first_name, last_name, company)
  VALUES ('test@example.com', 'hash', 'Test', 'User', 'Company');

  -- Verify invitation was processed
  SELECT COUNT(*) FROM fl_project_invitations
  WHERE user_id = (SELECT id FROM fl_users WHERE email = 'test@example.com');
  -- Should return 1

  SELECT accepted_at FROM fl_pending_invitations
  WHERE email = 'test@example.com';
  -- Should not be null
ROLLBACK;
```

### 🧪 Frontend Component Tests

**Team List Component**:
```typescript
import { render, screen } from '@testing-library/react'
import TeamList from './TeamList'

const mockMembers: TeamMember[] = [
  {
    user_id: 'user-1',
    email: 'active@test.com',
    name: 'Active User',
    role: 'member',
    can_invite: false,
    status: 'active',
    created_at: '2024-12-19T00:00:00Z'
  },
  {
    invitation_id: 'invite-1',
    email: 'pending@test.com',
    name: null,
    role: 'member',
    can_invite: false,
    status: 'pending',
    expires_at: '2024-12-26T00:00:00Z',
    created_at: '2024-12-19T00:00:00Z'
  }
]

test('should display active and pending members differently', () => {
  render(<TeamList members={mockMembers} />)

  // Active member should have checkmark
  expect(screen.getByText('Active User')).toBeInTheDocument()
  expect(screen.getByTestId('active-member-icon')).toBeInTheDocument()

  // Pending member should have question mark and badge
  expect(screen.getByText('pending@test.com')).toBeInTheDocument()
  expect(screen.getByText('Pending')).toBeInTheDocument()
  expect(screen.getByTestId('pending-member-icon')).toBeInTheDocument()
})
```

---

## Troubleshooting

### 🔧 Common Issues

#### **Issue**: Invitation not processed during registration
**Symptoms**: User registers but doesn't get project access
**Diagnosis**:
```sql
-- Check if pending invitation exists
SELECT * FROM fl_pending_invitations
WHERE email = 'user@example.com' AND accepted_at IS NULL;

-- Check if trigger is enabled
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgname = 'process_pending_invitations_on_register';
```
**Solution**: Ensure trigger exists and is enabled, check email case sensitivity.

#### **Issue**: Duplicate invitation errors
**Symptoms**: Error when inviting user already in project
**Diagnosis**:
```sql
-- Check existing memberships
SELECT 'active' as type, user_id, email, role FROM fl_project_invitations pi
JOIN fl_users u ON pi.user_id = u.id
WHERE pi.project_id = 'project-id'

UNION ALL

SELECT 'pending' as type, NULL as user_id, email, role FROM fl_pending_invitations
WHERE project_id = 'project-id' AND accepted_at IS NULL;
```
**Solution**: Check both active and pending tables before sending invitation.

#### **Issue**: Pending invitations not visible in UI
**Symptoms**: Pending members don't appear in team list
**Diagnosis**:
```typescript
// Check API response includes both types
const checkTeamResponse = async (projectId: string) => {
  const response = await fetch(`/api/projects/${projectId}`)
  const data = await response.json()

  console.log('Members:', data.members)
  console.log('Pending count:', data.members.filter(m => m.status === 'pending').length)
  console.log('Active count:', data.members.filter(m => m.status === 'active').length)
}
```
**Solution**: Verify API returns unified member list with status indicators.

#### **Issue**: Expired invitations not cleaned up
**Symptoms**: Old pending invitations still visible
**Diagnosis**:
```sql
-- Check for expired invitations
SELECT email, expires_at,
       CASE WHEN expires_at <= NOW() THEN 'expired' ELSE 'active' END as status
FROM fl_pending_invitations
WHERE accepted_at IS NULL;
```
**Solution**: Set up cron job to run `fl_cleanup_expired_invitations()` daily.

### 🔧 Database Maintenance

**Daily Cleanup (Recommended Cron Job)**:
```sql
-- Clean up expired invitations
SELECT fl_cleanup_expired_invitations();

-- Vacuum tables for performance
VACUUM ANALYZE fl_pending_invitations;
VACUUM ANALYZE fl_project_invitations;
```

**Performance Monitoring**:
```sql
-- Check invitation query performance
EXPLAIN ANALYZE
SELECT * FROM fl_get_project_invitations('project-uuid');

-- Monitor table sizes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE tablename IN ('fl_project_invitations', 'fl_pending_invitations');
```

---

## Code Examples

### 🔍 **Complete Invitation Flow**

**Frontend Invitation Component**:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface InviteFormProps {
  projectId: string
  onInviteSuccess: (member: TeamMember) => void
}

export default function InviteForm({ projectId, onInviteSuccess }: InviteFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'member' as 'member' | 'admin',
    can_invite: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }

      const result = await response.json()
      onInviteSuccess(result)

      // Show appropriate success message
      if (result.status === 'pending') {
        alert(`Invitation sent to ${formData.email}. They'll get project access when they register.`)
      } else {
        alert(`${formData.email} has been added to the project.`)
      }

      // Reset form
      setFormData({ email: '', role: 'member', can_invite: false })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="colleague@company.com"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <select
          id="role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as 'member' | 'admin' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="can_invite"
          checked={formData.can_invite}
          onChange={(e) => setFormData({ ...formData, can_invite: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="can_invite" className="ml-2 block text-sm text-gray-900">
          Can invite other members
        </label>
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Sending Invitation...' : 'Send Invitation'}
      </button>
    </form>
  )
}
```

**Backend API Handler**:
```typescript
// app/api/projects/[id]/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'
import { ServerSession } from '@/lib/auth/session'
import { z } from 'zod'

const InviteSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  role: z.enum(['member', 'admin']),
  can_invite: z.boolean().default(false)
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Require authentication
    const user = await ServerSession.requireAuth()
    const projectId = params.id

    // Validate input
    const body = await request.json()
    const { email, role, can_invite } = InviteSchema.parse(body)

    // Check if user has permission to invite
    const hasPermission = await checkInvitePermission(user.user_id, projectId)
    if (!hasPermission) {
      return NextResponse.json({ error: 'No permission to invite members' }, { status: 403 })
    }

    // Check if user already exists
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('fl_users')
      .select('id, email')
      .eq('email', email)
      .single()

    // If user exists, handle as existing user invitation
    if (targetUser && !userError) {
      // Check if already invited
      const { data: existingInvite } = await supabaseAdmin
        .from('fl_project_invitations')
        .select('id')
        .eq('user_id', targetUser.id)
        .eq('project_id', projectId)
        .single()

      if (existingInvite) {
        return NextResponse.json({ error: 'User already invited to this project' }, { status: 409 })
      }

      // Create immediate project membership
      const { data: invitation, error: createError } = await supabaseAdmin
        .from('fl_project_invitations')
        .insert({
          project_id: projectId,
          user_id: targetUser.id,
          role,
          can_invite
        })
        .select('id, role, can_invite, created_at')
        .single()

      if (createError) {
        console.error('Error creating invitation:', createError)
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
      }

      return NextResponse.json({
        ...invitation,
        project_id: projectId,
        user_id: targetUser.id,
        email: targetUser.email,
        status: 'active',
        message: 'User added to project successfully'
      }, { status: 201 })

    } else {
      // User doesn't exist - create pending invitation

      // Check if pending invitation already exists
      const { data: existingPending } = await supabaseAdmin
        .from('fl_pending_invitations')
        .select('id')
        .eq('email', email)
        .eq('project_id', projectId)
        .eq('accepted_at', null)
        .single()

      if (existingPending) {
        return NextResponse.json({ error: 'Pending invitation already exists for this email' }, { status: 409 })
      }

      // Create pending invitation
      const { data: pendingInvitation, error: pendingCreateError } = await supabaseAdmin
        .from('fl_pending_invitations')
        .insert({
          project_id: projectId,
          email,
          role,
          can_invite,
          invited_by: user.user_id
        })
        .select('id, email, role, can_invite, invitation_token, expires_at, created_at')
        .single()

      if (pendingCreateError) {
        console.error('Error creating pending invitation:', pendingCreateError)
        return NextResponse.json({ error: 'Failed to create pending invitation' }, { status: 500 })
      }

      return NextResponse.json({
        ...pendingInvitation,
        project_id: projectId,
        status: 'pending',
        message: `Invitation sent to ${email}. They will be added to the project when they register.`
      }, { status: 201 })
    }

  } catch (error) {
    console.error('Invitation API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function checkInvitePermission(userId: string, projectId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('fl_project_invitations')
    .select('role, can_invite')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single()

  return data?.role === 'owner' || data?.can_invite === true
}
```

---

## Conclusion

The enhanced team management system in FeeDLooP provides a comprehensive solution for collaborative project management. By supporting both existing and non-registered users through email-based invitations, the system eliminates barriers to team collaboration while maintaining security and proper access controls.

### Key Benefits

- ✅ **Seamless Onboarding**: New users get automatic project access upon registration
- ✅ **Flexible Invitations**: Support for both immediate and pending access patterns
- ✅ **Visual Clarity**: Clear UI indicators distinguish between active and pending members
- ✅ **Secure Architecture**: Token-based invitations with expiration and RLS protection
- ✅ **Automated Processing**: Database triggers handle invitation workflow automatically
- ✅ **Comprehensive Testing**: Full E2E test coverage ensures system reliability

This documentation provides both technical implementation details for AI coders and clear explanations for human users, enabling effective team management and collaboration within the FeeDLooP platform.