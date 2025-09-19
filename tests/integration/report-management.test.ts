/**
 * Integration Test: Dashboard Report Management and Status Updates
 * T026: Complete report management workflow in dashboard
 *
 * This test MUST FAIL until the actual dashboard and report management system is implemented
 */

describe('Report Management Integration Test', () => {
  const user = {
    email: 'manager@example.com',
    password: 'ManagerPass123!',
    firstName: 'Report',
    lastName: 'Manager',
    company: 'Management Co'
  }

  let sessionToken: string
  let projectId: string
  let reportIds: string[] = []

  beforeAll(async () => {
    // Setup user and project with sample reports
    await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    })

    await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    })

    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password })
    })

    const loginData = await loginResponse.json()
    sessionToken = loginData.session.access_token

    const projectResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Report Management Test Project',
        description: 'Testing report management features'
      })
    })

    const projectData = await projectResponse.json()
    projectId = projectData.project.id

    // Create sample reports via widget
    const sampleReports = [
      { type: 'bug', title: 'Critical login issue', priority: 'critical' },
      { type: 'bug', title: 'Minor UI glitch', priority: 'low' },
      { type: 'initiative', title: 'Add dark mode', priority: 'medium' },
      { type: 'feedback', title: 'Great performance', priority: 'low' }
    ]

    for (const report of sampleReports) {
      const response = await fetch('http://localhost:3000/api/widget/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_key: projectData.project.integration_key,
          ...report,
          description: `Test ${report.type} description`,
          user_info: { name: 'Test User', email: 'test@example.com' }
        })
      })
      const data = await response.json()
      reportIds.push(data.report.id)
    }
  })

  it('should complete full report management workflow', async () => {
    // Step 1: View all reports with filtering and sorting
    const allReportsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(allReportsResponse.status).toBe(200)

    const allReports = await allReportsResponse.json()
    expect(allReports.reports).toHaveLength(4)

    // Step 2: Filter by bug reports only
    const bugReportsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports?type=bug`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    const bugReports = await bugReportsResponse.json()
    expect(bugReports.reports).toHaveLength(2)

    // Step 3: Update critical bug to acknowledged status
    const criticalBug = bugReports.reports.find((r: any) => r.title.includes('Critical'))
    const updateResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports/${criticalBug.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'acknowledged',
        priority: 'critical',
        internal_notes: 'Investigating root cause'
      })
    })

    expect(updateResponse.status).toBe(200)

    // Step 4: Batch update multiple reports
    const batchUpdates = reportIds.slice(1, 3).map(id => ({
      id,
      status: 'in_progress'
    }))

    const batchResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports/batch`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ updates: batchUpdates })
    })

    expect(batchResponse.status).toBe(200)

    // Step 5: Filter by status to verify updates
    const inProgressResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports?status=in_progress`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    const inProgressReports = await inProgressResponse.json()
    expect(inProgressReports.reports).toHaveLength(2)

    // Step 6: Test export functionality
    const exportResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/export?format=csv`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    })

    expect(exportResponse.status).toBe(200)
    expect(exportResponse.headers.get('Content-Type')).toBe('text/csv')

    const csvContent = await exportResponse.text()
    expect(csvContent).toContain('ID,Type,Title,Description,Status,Priority')
    expect(csvContent.split('\n')).toHaveLength(6) // Header + 4 reports + empty line
  })

  afterAll(async () => {
    await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    })
  })
})