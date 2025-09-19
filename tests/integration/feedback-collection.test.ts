/**
 * Integration Test: Widget Feedback Submission
 * T025: Complete widget feedback submission flow (bug, initiative, feedback)
 *
 * This test MUST FAIL until the actual widget and report system is implemented
 */

describe('Feedback Collection Integration Test', () => {
  const projectOwner = {
    email: 'widget-owner@example.com',
    password: 'WidgetPassword123!',
    firstName: 'Widget',
    lastName: 'Owner',
    company: 'Widget Company'
  }

  let ownerSessionToken: string
  let projectId: string
  let integrationKey: string

  beforeAll(async () => {
    // Clean up and register user
    await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: projectOwner.email })
    })

    await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectOwner)
    })

    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: projectOwner.email,
        password: projectOwner.password
      })
    })

    const loginData = await loginResponse.json()
    ownerSessionToken = loginData.session.access_token

    // Create a project for widget testing
    const projectResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Widget Testing Project',
        description: 'Project for testing widget feedback collection',
        domain: 'https://widget-test.com'
      })
    })

    const projectData = await projectResponse.json()
    projectId = projectData.project.id
    integrationKey = projectData.project.integration_key
  })

  it('should complete full widget feedback collection workflow', async () => {
    // Step 1: Submit a bug report through widget
    const bugReport = {
      project_key: integrationKey,
      type: 'bug',
      title: 'Login form validation not working',
      description: 'When I enter an invalid email, the form submits anyway without showing an error message',
      user_info: {
        name: 'Bug Reporter',
        email: 'bugreporter@example.com',
        browser: 'Chrome 120.0.6099.224',
        os: 'Windows 11',
        url: 'https://widget-test.com/login',
        screen_resolution: '1920x1080'
      },
      diagnostic_data: {
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: '2023-12-01T10:30:00Z',
        page_url: 'https://widget-test.com/login',
        console_errors: [
          'Uncaught TypeError: Cannot read property validateEmail of undefined',
          'Form validation script not loaded'
        ],
        network_requests: [
          {
            url: '/api/validate-email',
            method: 'POST',
            status: 404,
            timestamp: '2023-12-01T10:29:58Z'
          }
        ]
      }
    }

    const bugResponse = await fetch('http://localhost:3000/api/widget/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://widget-test.com'
      },
      body: JSON.stringify(bugReport)
    })

    expect(bugResponse.status).toBe(201)

    const bugData = await bugResponse.json()
    expect(bugData).toHaveProperty('report')
    expect(bugData.report).toHaveProperty('id')
    expect(bugData.report).toHaveProperty('type', 'bug')
    expect(bugData.report).toHaveProperty('title', bugReport.title)
    expect(bugData.report).toHaveProperty('status', 'new')
    expect(bugData.report).toHaveProperty('priority', 'medium')

    const bugReportId = bugData.report.id

    // Step 2: Submit an initiative through widget
    const initiativeReport = {
      project_key: integrationKey,
      type: 'initiative',
      title: 'Add password strength indicator',
      description: 'It would be helpful to show users how strong their password is while they type it',
      user_info: {
        name: 'Feature Requester',
        email: 'features@example.com',
        browser: 'Safari 17.1',
        os: 'macOS 14.2'
      }
    }

    const initiativeResponse = await fetch('http://localhost:3000/api/widget/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://widget-test.com'
      },
      body: JSON.stringify(initiativeReport)
    })

    expect(initiativeResponse.status).toBe(201)

    const initiativeData = await initiativeResponse.json()
    expect(initiativeData.report).toHaveProperty('type', 'initiative')
    expect(initiativeData.report).toHaveProperty('priority', 'low')

    const initiativeReportId = initiativeData.report.id

    // Step 3: Submit feedback with attachment through widget
    const feedbackReport = {
      project_key: integrationKey,
      type: 'feedback',
      title: 'Love the new dashboard design',
      description: 'The updated dashboard is much cleaner and easier to navigate. Great work!',
      user_info: {
        name: 'Happy User',
        email: 'happy@example.com',
        browser: 'Firefox 121.0',
        os: 'Ubuntu 22.04'
      },
      attachments: [
        {
          filename: 'dashboard-screenshot.png',
          content_type: 'image/png',
          size: 85432,
          base64_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        }
      ]
    }

    const feedbackResponse = await fetch('http://localhost:3000/api/widget/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://widget-test.com'
      },
      body: JSON.stringify(feedbackReport)
    })

    expect(feedbackResponse.status).toBe(201)

    const feedbackData = await feedbackResponse.json()
    expect(feedbackData.report).toHaveProperty('type', 'feedback')
    expect(feedbackData.report).toHaveProperty('attachments')
    expect(feedbackData.report.attachments).toHaveLength(1)
    expect(feedbackData.report.attachments[0]).toHaveProperty('filename', 'dashboard-screenshot.png')

    const feedbackReportId = feedbackData.report.id

    // Step 4: Verify all submissions appear in project dashboard
    const reportsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(reportsResponse.status).toBe(200)

    const reportsData = await reportsResponse.json()
    expect(reportsData).toHaveProperty('reports')
    expect(reportsData.reports).toHaveLength(3)

    const reportTypes = reportsData.reports.map((r: any) => r.type)
    expect(reportTypes).toContain('bug')
    expect(reportTypes).toContain('initiative')
    expect(reportTypes).toContain('feedback')

    // Step 5: Owner can view detailed information for each report
    const bugDetailsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports/${bugReportId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(bugDetailsResponse.status).toBe(200)

    const bugDetails = await bugDetailsResponse.json()
    expect(bugDetails.report).toHaveProperty('diagnostic_data')
    expect(bugDetails.report.diagnostic_data).toHaveProperty('console_errors')
    expect(bugDetails.report.diagnostic_data).toHaveProperty('network_requests')
    expect(bugDetails.report.diagnostic_data.console_errors).toHaveLength(2)

    // Step 6: Owner updates bug report status and priority
    const bugUpdateResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports/${bugReportId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'acknowledged',
        priority: 'high',
        internal_notes: 'Critical bug affecting user authentication flow'
      })
    })

    expect(bugUpdateResponse.status).toBe(200)

    const bugUpdateData = await bugUpdateResponse.json()
    expect(bugUpdateData.report).toHaveProperty('status', 'acknowledged')
    expect(bugUpdateData.report).toHaveProperty('priority', 'high')
    expect(bugUpdateData.report).toHaveProperty('internal_notes')

    // Step 7: Owner updates initiative status
    const initiativeUpdateResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports/${initiativeReportId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'in_progress',
        priority: 'medium',
        internal_notes: 'Added to sprint backlog for next release'
      })
    })

    expect(initiativeUpdateResponse.status).toBe(200)

    // Step 8: Filter reports by type and status
    const bugFilterResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports?type=bug&status=acknowledged`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(bugFilterResponse.status).toBe(200)

    const bugFilterData = await bugFilterResponse.json()
    expect(bugFilterData.reports).toHaveLength(1)
    expect(bugFilterData.reports[0]).toHaveProperty('type', 'bug')
    expect(bugFilterData.reports[0]).toHaveProperty('status', 'acknowledged')

    // Step 9: Submit multiple bug reports to test bulk operations
    const bulkBugs = [
      {
        project_key: integrationKey,
        type: 'bug',
        title: 'Search not working on mobile',
        description: 'Search functionality breaks on mobile devices',
        user_info: { name: 'Mobile User', email: 'mobile@example.com' }
      },
      {
        project_key: integrationKey,
        type: 'bug',
        title: 'Page loading too slow',
        description: 'Pages take more than 10 seconds to load',
        user_info: { name: 'Slow User', email: 'slow@example.com' }
      }
    ]

    const bulkResponses = await Promise.all(
      bulkBugs.map(bug =>
        fetch('http://localhost:3000/api/widget/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bug)
        })
      )
    )

    bulkResponses.forEach(response => {
      expect(response.status).toBe(201)
    })

    // Step 10: Verify total report count
    const finalReportsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    const finalReportsData = await finalReportsResponse.json()
    expect(finalReportsData.reports).toHaveLength(5) // 3 original + 2 bulk bugs

    // Step 11: Test pagination with large number of reports
    const paginatedResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports?page=1&limit=3`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(paginatedResponse.status).toBe(200)

    const paginatedData = await paginatedResponse.json()
    expect(paginatedData.reports).toHaveLength(3)
    expect(paginatedData.pagination).toHaveProperty('page', 1)
    expect(paginatedData.pagination).toHaveProperty('limit', 3)
    expect(paginatedData.pagination).toHaveProperty('total', 5)
  })

  it('should handle widget submissions with large attachments', async () => {
    const reportWithLargeAttachment = {
      project_key: integrationKey,
      type: 'bug',
      title: 'Test with large attachment',
      description: 'Testing file size limits',
      attachments: [
        {
          filename: 'large-screenshot.png',
          content_type: 'image/png',
          size: 4.8 * 1024 * 1024, // 4.8MB - just under 5MB limit
          base64_data: 'x'.repeat(1000) // Simulated large base64 data
        }
      ]
    }

    const response = await fetch('http://localhost:3000/api/widget/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportWithLargeAttachment)
    })

    expect(response.status).toBe(201)
  })

  it('should reject widget submissions with oversized attachments', async () => {
    const reportWithOversizedAttachment = {
      project_key: integrationKey,
      type: 'bug',
      title: 'Test with oversized attachment',
      description: 'Testing file size rejection',
      attachments: [
        {
          filename: 'oversized-file.png',
          content_type: 'image/png',
          size: 6 * 1024 * 1024, // 6MB - over 5MB limit
          base64_data: 'x'.repeat(1000)
        }
      ]
    }

    const response = await fetch('http://localhost:3000/api/widget/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportWithOversizedAttachment)
    })

    expect(response.status).toBe(413)
  })

  it('should handle widget rate limiting', async () => {
    // Submit multiple reports rapidly
    const rapidReports = Array.from({ length: 15 }, (_, i) => ({
      project_key: integrationKey,
      type: 'feedback',
      title: `Rapid feedback ${i + 1}`,
      description: 'Testing rate limiting'
    }))

    const rapidResponses = await Promise.all(
      rapidReports.map(report =>
        fetch('http://localhost:3000/api/widget/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        })
      )
    )

    // Some should succeed, some should be rate limited
    const successCount = rapidResponses.filter(r => r.status === 201).length
    const rateLimitedCount = rapidResponses.filter(r => r.status === 429).length

    expect(successCount).toBeGreaterThan(0)
    expect(rateLimitedCount).toBeGreaterThan(0)
  })

  afterAll(async () => {
    // Clean up test data
    await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: projectOwner.email })
    })
  })
})