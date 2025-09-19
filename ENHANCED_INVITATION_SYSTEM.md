# Enhanced Email-Based Invitation System

## Overview

The FeeDLooP invitation system has been enhanced to support email-based invitations for non-registered users. This allows project owners and admins to invite anyone by email address, and those users will automatically be added to the project when they register.

## Key Features

### 🚀 **Email-Based Invitations**
- Invite users who haven't registered yet
- Automatic project access upon registration
- 7-day invitation expiration
- Secure invitation tokens

### 📧 **Dual Invitation Support**
- **Existing Users**: Immediate project access
- **New Users**: Pending invitation until registration

### 🔄 **Automatic Processing**
- Database triggers automatically process pending invitations during registration
- Users see welcome message with project information upon registration

### 🎛️ **Enhanced UI**
- Visual distinction between active members and pending invitations
- Expiration date display for pending invitations
- Cancel pending invitations functionality

## Database Schema Changes

### New Table: `fl_pending_invitations`

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
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Database Functions Added

1. **`fl_process_pending_invitations()`**: Trigger function that automatically processes pending invitations when a user registers
2. **`fl_cleanup_expired_invitations()`**: Utility function for cleaning up expired invitations
3. **`fl_get_project_invitations(UUID)`**: Unified view of both active members and pending invitations
4. **`fl_get_pending_invitations_for_email(VARCHAR)`**: Get pending invitations for a specific email during registration

### Security Features

- Row Level Security (RLS) enabled on all new tables
- Invitation tokens are securely generated
- Expired invitations are automatically excluded from queries
- Users can only manage invitations for projects they have access to

## API Endpoints Enhanced

### **POST /api/projects/{projectId}/invitations**

**Enhanced Behavior:**
- If user exists → Creates immediate project membership
- If user doesn't exist → Creates pending invitation

**New Response Format:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "email": "user@example.com",
  "role": "member",
  "status": "pending",
  "expires_at": "2024-12-26T00:00:00Z",
  "message": "Invitation sent to user@example.com. They will be added to the project when they register."
}
```

### **GET /api/projects/{projectId}**

**Enhanced Response:**
Members array now includes both active members and pending invitations:

```json
{
  "members": [
    {
      "user_id": "uuid",
      "email": "active@user.com",
      "name": "John Doe",
      "role": "member",
      "status": "active"
    },
    {
      "invitation_id": "uuid",
      "email": "pending@user.com",
      "name": null,
      "role": "member",
      "status": "pending",
      "expires_at": "2024-12-26T00:00:00Z"
    }
  ]
}
```

### **DELETE /api/projects/{projectId}/invitations**

**Enhanced Payload:**
```json
{
  "user_id": "uuid",           // For removing active members
  "invitation_id": "uuid",     // For canceling pending invitations
  "is_pending": true           // Flag to indicate pending invitation
}
```

### **POST /api/auth/register**

**Enhanced Response:**
```json
{
  "user": { /* user data */ },
  "message": "Account created successfully. You've been added to 2 projects.",
  "processed_invitations": [
    {
      "project_id": "uuid",
      "project_name": "My Project",
      "role": "member"
    }
  ]
}
```

## Frontend Changes

### Team Management Page (`/dashboard/projects/[id]/team`)

**Enhanced Interface:**
- Displays both active members and pending invitations
- Visual indicators for pending status (orange question mark avatar)
- "Pending" badges for unregistered invites
- Expiration dates shown for pending invitations
- Cancel/Remove buttons work for both types

**Updated TeamMember Interface:**
```typescript
interface TeamMember {
  user_id: string | null
  invitation_id?: string
  email: string
  name: string | null
  role: 'owner' | 'member' | 'admin'
  can_invite: boolean
  status: 'active' | 'pending'
  expires_at?: string
  created_at?: string
}
```

### Registration Flow Enhancement

- New users see welcome message listing projects they've been invited to
- Automatic redirection to dashboard with project access
- Seamless onboarding experience

## Migration Instructions

### Step 1: Run Database Migration

Execute the SQL migration in your Supabase SQL Editor:

```bash
# File location: database-migrations/001-pending-invitations.sql
# Copy the entire contents and run in Supabase Dashboard > SQL Editor
```

### Step 2: Verify Migration

Check that the following were created:
- `fl_pending_invitations` table
- Trigger function `fl_process_pending_invitations()`
- Helper functions for invitation management
- Proper RLS policies

### Step 3: Test the Flow

1. **Create Pending Invitation:**
   - Go to project team management
   - Invite a non-registered user email
   - Verify "pending" status appears in UI

2. **Test Registration Flow:**
   - Register with the invited email
   - Verify automatic project access
   - Check welcome message includes project information

## Benefits

### 🎯 **User Experience**
- No more "user not found" errors
- Seamless onboarding for new users
- Clear visual feedback on invitation status

### 🔒 **Security**
- Secure token-based invitations
- Automatic expiration prevents stale invitations
- RLS protection on all operations

### 🚀 **Scalability**
- Handles high-volume invitation workflows
- Efficient database operations with proper indexing
- Automatic cleanup of expired invitations

## Technical Architecture

### Database Layer
```
fl_users (existing) → fl_project_invitations (existing) → Active Members
                  ↘                                    ↗
fl_pending_invitations (new) ----------------------→ Pending Invites
```

### API Layer Flow
```
1. POST /invitations → Check if user exists
2. If exists → Create fl_project_invitations entry
3. If not → Create fl_pending_invitations entry
4. On registration → Trigger processes pending → Create fl_project_invitations
```

### Frontend State Management
```
Project → members: [
  { status: 'active', user_id: 'uuid', ... },
  { status: 'pending', invitation_id: 'uuid', ... }
]
```

## Future Enhancements

### Potential Improvements
- [ ] Email notification system for invitations
- [ ] Bulk invitation support
- [ ] Invitation acceptance/decline workflow
- [ ] Role-based invitation templates
- [ ] Integration with external identity providers

### Monitoring & Analytics
- [ ] Track invitation conversion rates
- [ ] Monitor expired invitation cleanup
- [ ] Dashboard for invitation metrics

## Testing

### Manual Testing Checklist
- [ ] Invite existing user (immediate access)
- [ ] Invite non-registered user (pending status)
- [ ] Register with pending invitation (automatic access)
- [ ] Cancel pending invitation
- [ ] Remove active member
- [ ] Test invitation expiration
- [ ] Verify RLS policies

### E2E Test Coverage
- [ ] Create comprehensive Playwright tests
- [ ] Test both invitation workflows
- [ ] Verify UI states and transitions
- [ ] Test error handling and edge cases

---

## Summary

The enhanced invitation system transforms FeeDLooP from a "user lookup" model to a true "invitation workflow" that supports modern collaborative software development. Users can now invite anyone by email, creating a seamless onboarding experience that automatically grants project access upon registration.

This implementation follows security best practices with proper database triggers, RLS policies, and token-based invitations while maintaining backward compatibility with the existing user management system.