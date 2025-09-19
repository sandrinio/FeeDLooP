/**
 * Integration Test: CSV Export Functionality
 * T028: Complete export workflow
 *
 * This test MUST FAIL until the actual export system is implemented
 */

describe('Export Integration Test', () => {
  const user = {
    email: 'exporter@example.com',
    password: 'ExportPass123!',
    firstName: 'Export',
    lastName: 'User',
    company: 'Export Co'
  }

  let sessionToken: string
  let projectId: string

  beforeAll(async () => {
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
        name: 'Export Test Project',
        description: 'Testing export functionality'
      })
    })

    const projectData = await projectResponse.json()
    projectId = projectData.project.id

    // Create test reports
    const reports = [
      { type: 'bug', title: 'Export Bug 1', status: 'new' },
      { type: 'initiative', title: 'Export Initiative 1', status: 'in_progress' },
      { type: 'feedback', title: 'Export Feedback 1', status: 'resolved' }
    ]

    for (const report of reports) {
      await fetch('http://localhost:3000/api/widget/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_key: projectData.project.integration_key,
          ...report,
          description: `Test ${report.type} for export`,
          user_info: { name: 'Export Tester', email: 'test@example.com' }
        })
      })
    }
  })

  it('should complete export workflow with different formats', async () => {
    // Test standard CSV export
    const csvResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/export?format=csv`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })

    expect(csvResponse.status).toBe(200)
    expect(csvResponse.headers.get('Content-Type')).toBe('text/csv')

    const csvContent = await csvResponse.text()
    expect(csvContent).toContain('ID,Type,Title,Description,Status,Priority')
    expect(csvContent.split('\n')).toHaveLength(5) // Header + 3 reports + empty line

    // Test Jira format export
    const jiraResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/export?format=csv&template=jira`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })

    expect(jiraResponse.status).toBe(200)

    const jiraContent = await jiraResponse.text()
    expect(jiraContent).toContain('Issue Type,Summary,Description,Priority,Status,Reporter')

    // Test filtered export
    const filteredResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/export?format=csv&type=bug`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })

    expect(filteredResponse.status).toBe(200)

    const filteredContent = await filteredResponse.text()
    expect(filteredContent.split('\n')).toHaveLength(3) // Header + 1 bug report + empty line
  })

  afterAll(async () => {
    await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    })
  })
})