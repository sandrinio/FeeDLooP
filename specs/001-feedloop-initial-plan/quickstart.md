# Quickstart Guide: FeeDLooP MVP

**Date**: 2025-01-19
**Purpose**: End-to-end validation of FeeDLooP MVP functionality

## Prerequisites

### Development Environment
- Node.js 18+ installed
- Docker and Docker Compose available
- Git repository cloned

### Environment Setup
```bash
# Clone and setup
git clone <repository-url>
cd feedloop-v1
npm install

# Start local services
docker-compose up -d supabase minio

# Environment variables
cp .env.example .env.local
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, MINIO_* values

# Start development server
npm run dev
```

## User Journey Validation

### 1. Project Owner Onboarding (5 minutes)

#### Account Creation
1. **Navigate** to `http://localhost:3000`
2. **Click** "Sign Up" button
3. **Fill form** with:
   - Email: `owner@example.com`
   - Password: `password123`
   - Name: `Project Owner`
4. **Verify**: Redirected to dashboard
5. **Verify**: Shows "Welcome" message and empty projects list

#### First Project Creation
1. **Click** "Create Project" button
2. **Enter name**: `Test Project Alpha`
3. **Click** "Create"
4. **Verify**: Project appears in dashboard with:
   - Project name: "Test Project Alpha"
   - Report count: 0
   - Integration snippet available

#### Team Member Invitation
1. **Click** project "Settings" tab
2. **Enter email**: `member@example.com`
3. **Check** "Can invite others" checkbox
4. **Click** "Send Invitation"
5. **Verify**: Member appears in project members list
6. **Verify**: Member shows role "Member" with invite permission

### 2. Widget Integration Testing (3 minutes)

#### Widget Deployment
1. **Copy** integration script from project settings
2. **Create** test HTML file:
```html
<!DOCTYPE html>
<html>
<head><title>Test Site</title></head>
<body>
    <h1>Test Application</h1>
    <p>This is a test site for FeeDLooP widget.</p>

    <!-- FeeDLooP Widget -->
    <script src="http://localhost:3000/widget.js" data-project-key="[PROJECT_KEY]"></script>
</body>
</html>
```
3. **Open** HTML file in browser
4. **Verify**: "Feedback" tab appears in bottom-right corner
5. **Verify**: Tab is styled and positioned correctly

#### Widget Functionality Test
1. **Click** "Feedback" tab
2. **Verify**: Slide-out form appears with:
   - Report type selector (Bug, Initiative, Feedback)
   - Title field
   - Description field with rich text editor
   - File attachment area
   - Submit button
3. **Test CSS isolation**: Add `<style>* { color: red !important; }</style>` to test page
4. **Verify**: Widget styling unaffected by host CSS

### 3. Feedback Collection Flow (10 minutes)

#### Bug Report Submission
1. **Select** "Bug" report type
2. **Enter title**: `Login button not working`
3. **Enter description**: `When I click the login button, nothing happens. Expected: login form to appear.`
4. **Attach** screenshot image (drag & drop)
5. **Click** "Submit"
6. **Verify**: Success message appears
7. **Verify**: Form resets and closes

#### Initiative Report Submission
1. **Click** "Feedback" tab again
2. **Select** "Initiative" type
3. **Enter title**: `Add dark mode theme`
4. **Enter rich text description**:
   - Use **bold** and *italic* formatting
   - Add bulleted list of requirements
5. **Click** "Submit"
6. **Verify**: Submission successful

#### Feedback Report Submission
1. **Select** "Feedback" type
2. **Enter title**: `Great user experience`
3. **Enter description**: `The new dashboard layout is much more intuitive than the previous version.`
4. **Enter reporter info**:
   - Name: `Happy User`
   - Email: `user@client.com`
5. **Click** "Submit"

### 4. Dashboard Management (7 minutes)

#### Reports Dashboard Validation
1. **Switch** to dashboard tab
2. **Navigate** to project "Test Project Alpha"
3. **Verify** reports list shows:
   - 3 total reports in "Active" view
   - Bug report with attachment icon
   - Initiative report with rich text preview
   - Feedback report with reporter information
4. **Verify** each report shows:
   - Correct type badge (Bug/Initiative/Feedback)
   - Title and truncated description
   - Submission timestamp
   - Reporter information (when provided)

#### Report Detail View
1. **Click** on bug report
2. **Verify** detail view shows:
   - Complete description
   - Diagnostic data: URL, browser info, console logs
   - Attached screenshot with download link
   - All submission metadata
3. **Return** to reports list

#### Report Status Management
1. **Click** "Archive" on feedback report
2. **Verify**: Report moves to "Archived" view
3. **Switch** to "Archived" view
4. **Verify**: Feedback report appears with "Archived" status
5. **Click** "Restore"
6. **Verify**: Report returns to "Active" view

### 5. Team Collaboration (5 minutes)

#### Member Access Testing
1. **Open** incognito/private browser window
2. **Register** new account:
   - Email: `member@example.com`
   - Password: `password123`
   - Name: `Team Member`
3. **Verify**: Dashboard shows "Test Project Alpha" (invited project)
4. **Click** project to view reports
5. **Verify**: Can see all reports but cannot access project settings

#### Member Invitation Testing
1. **Verify**: Member can invite new users (permission granted earlier)
2. **Invite**: `member2@example.com`
3. **Switch** back to owner account
4. **Verify**: New member appears in project members list

### 6. Export Functionality (3 minutes)

#### CSV Export Test
1. **Navigate** to project reports
2. **Click** "Export to CSV" button
3. **Verify**: CSV file downloads with:
   - All active reports included
   - Proper headers: ID, Type, Title, Description, Status, Created, Reporter
   - Data correctly formatted for Jira/Azure DevOps import
4. **Open** CSV file
5. **Verify**: Data accuracy and completeness

### 7. File Management (3 minutes)

#### Upload Validation
1. **Create** new bug report via widget
2. **Try uploading** 6 images
3. **Verify**: System prevents upload after 5th file
4. **Try uploading** large file (>10MB)
5. **Verify**: System rejects oversized file
6. **Upload** valid files: PNG, JPG, PDF, XLSX
7. **Verify**: All supported formats accepted

#### Attachment Access
1. **View** report in dashboard
2. **Click** attachment download links
3. **Verify**: Files download correctly
4. **Verify**: Images display in browser
5. **Verify**: Documents open in appropriate applications

## Performance Validation

### Widget Load Time
1. **Open** browser developer tools
2. **Refresh** test page with widget
3. **Verify**: Widget loads in <500ms (Network tab)
4. **Verify**: No JavaScript errors in console

### Dashboard Responsiveness
1. **Navigate** through dashboard pages
2. **Verify**: Page transitions in <200ms
3. **Test** on mobile viewport (DevTools device emulation)
4. **Verify**: Responsive design works correctly

## Security Validation

### Authentication Protection
1. **Try accessing** `/api/projects` without authentication
2. **Verify**: 401 Unauthorized response
3. **Try accessing** another user's project directly
4. **Verify**: 403 Forbidden response

### Input Validation
1. **Submit** report with 1001+ words in description
2. **Verify**: Validation error appears
3. **Try submitting** invalid email format
4. **Verify**: Email validation works
5. **Test** XSS attempt: Enter `<script>alert('xss')</script>` in report
6. **Verify**: Content properly escaped in dashboard

## Success Criteria

### ✅ All Tests Must Pass
- [ ] User registration and authentication works
- [ ] Project creation and management functions
- [ ] Widget embeds correctly with CSS isolation
- [ ] All report types submit successfully with proper data capture
- [ ] Dashboard displays reports correctly
- [ ] Report status management (archive/restore) works
- [ ] Team invitation and access control functions
- [ ] CSV export generates correct format
- [ ] File upload respects size and type limits
- [ ] Performance targets met (<500ms widget, <200ms dashboard)
- [ ] Security measures prevent unauthorized access
- [ ] Input validation prevents malicious content

### ✅ User Experience Validation
- [ ] Workflow feels intuitive and smooth
- [ ] Error messages are clear and helpful
- [ ] Loading states provide good feedback
- [ ] Mobile experience is usable
- [ ] Widget doesn't interfere with host site

### ✅ Technical Integration
- [ ] Database relationships work correctly
- [ ] File storage and retrieval functions
- [ ] Real-time updates appear in dashboard
- [ ] Email notifications (if implemented) work
- [ ] Export data imports successfully into Jira/Azure DevOps

## Troubleshooting

### Common Issues
1. **Widget not appearing**: Check console for CORS errors, verify project key
2. **Database connection errors**: Ensure Supabase is running and configured
3. **File upload failures**: Check MinIO service and bucket permissions
4. **Authentication issues**: Verify NextAuth configuration and secrets

### Debug Commands
```bash
# Check running services
docker-compose ps

# View application logs
npm run dev --verbose

# Database connection test
npm run db:test

# Clear browser cache and cookies
# Use browser developer tools > Application > Clear Storage
```

## Completion

This quickstart guide validates all core MVP functionality. Upon successful completion:

1. **Document** any issues encountered during testing
2. **Verify** all success criteria are met
3. **Prepare** for production deployment
4. **Schedule** user acceptance testing with stakeholders

**Expected Duration**: 30-40 minutes for complete walkthrough
**Prerequisites Met**: ✅ Ready for production deployment