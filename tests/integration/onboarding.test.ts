/**
 * Integration Test: User Registration and Authentication Flow
 * T023: Complete user onboarding flow
 *
 * This test MUST FAIL until the actual authentication system is implemented
 */

describe('User Onboarding Integration Test', () => {
  const testUser = {
    email: 'integration-test@example.com',
    password: 'TestPassword123!',
    firstName: 'Integration',
    lastName: 'Test',
    company: 'Test Company Inc.'
  }

  beforeEach(async () => {
    // Clean up any existing test user
    await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email })
    })
  })

  it('should complete full user onboarding and authentication flow', async () => {
    // Step 1: User visits registration page and registers
    const registrationResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    })

    expect(registrationResponse.status).toBe(201)

    const registrationData = await registrationResponse.json()
    expect(registrationData).toHaveProperty('user')
    expect(registrationData.user).toHaveProperty('id')
    expect(registrationData.user).toHaveProperty('email', testUser.email)
    expect(registrationData.user).toHaveProperty('first_name', testUser.firstName)
    expect(registrationData.user).toHaveProperty('last_name', testUser.lastName)
    expect(registrationData.user).toHaveProperty('company', testUser.company)
    expect(registrationData.user).not.toHaveProperty('password')

    const userId = registrationData.user.id

    // Step 2: User attempts to login with correct credentials
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    })

    expect(loginResponse.status).toBe(200)

    const loginData = await loginResponse.json()
    expect(loginData).toHaveProperty('user')
    expect(loginData).toHaveProperty('session')
    expect(loginData.user.id).toBe(userId)

    const sessionToken = loginData.session.access_token

    // Step 3: User accesses protected dashboard endpoint
    const dashboardResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(dashboardResponse.status).toBe(200)

    const dashboardData = await dashboardResponse.json()
    expect(dashboardData).toHaveProperty('projects')
    expect(Array.isArray(dashboardData.projects)).toBe(true)
    expect(dashboardData.projects).toHaveLength(0) // New user should have no projects

    // Step 4: User creates their first project
    const projectData = {
      name: 'My First Project',
      description: 'This is my first feedback collection project',
      domain: 'https://my-first-app.com'
    }

    const createProjectResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    })

    expect(createProjectResponse.status).toBe(201)

    const projectResponseData = await createProjectResponse.json()
    expect(projectResponseData).toHaveProperty('project')
    expect(projectResponseData.project).toHaveProperty('id')
    expect(projectResponseData.project).toHaveProperty('name', projectData.name)
    expect(projectResponseData.project).toHaveProperty('description', projectData.description)
    expect(projectResponseData.project).toHaveProperty('domain', projectData.domain)
    expect(projectResponseData.project).toHaveProperty('integration_key')
    expect(projectResponseData.project).toHaveProperty('owner_id', userId)

    const projectId = projectResponseData.project.id
    const integrationKey = projectResponseData.project.integration_key

    // Step 5: Verify user now has one project in their dashboard
    const updatedDashboardResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(updatedDashboardResponse.status).toBe(200)

    const updatedDashboardData = await updatedDashboardResponse.json()
    expect(updatedDashboardData.projects).toHaveLength(1)
    expect(updatedDashboardData.projects[0].id).toBe(projectId)

    // Step 6: User can access their project details
    const projectDetailsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(projectDetailsResponse.status).toBe(200)

    const projectDetails = await projectDetailsResponse.json()
    expect(projectDetails).toHaveProperty('project')
    expect(projectDetails.project).toHaveProperty('team_members')
    expect(Array.isArray(projectDetails.project.team_members)).toBe(true)
    expect(projectDetails.project.team_members).toHaveLength(1) // Only the owner
    expect(projectDetails.project.team_members[0]).toHaveProperty('email', testUser.email)
    expect(projectDetails.project.team_members[0]).toHaveProperty('role', 'owner')

    // Step 7: Verify integration key works for widget submissions
    const widgetSubmission = {
      project_key: integrationKey,
      type: 'feedback',
      title: 'First feedback from onboarding test',
      description: 'This is a test feedback submission during onboarding',
      user_info: {
        name: 'Widget Test User',
        email: 'widget@example.com'
      }
    }

    const widgetResponse = await fetch('http://localhost:3000/api/widget/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(widgetSubmission)
    })

    expect(widgetResponse.status).toBe(201)

    const widgetData = await widgetResponse.json()
    expect(widgetData).toHaveProperty('report')
    expect(widgetData.report).toHaveProperty('project_id', projectId)

    // Step 8: User can see the widget submission in their project reports
    const reportsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(reportsResponse.status).toBe(200)

    const reportsData = await reportsResponse.json()
    expect(reportsData).toHaveProperty('reports')
    expect(reportsData.reports).toHaveLength(1)
    expect(reportsData.reports[0]).toHaveProperty('title', widgetSubmission.title)
    expect(reportsData.reports[0]).toHaveProperty('type', 'feedback')
    expect(reportsData.reports[0]).toHaveProperty('status', 'new')
  })

  it('should prevent registration with duplicate email', async () => {
    // First registration
    const firstResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    })

    expect(firstResponse.status).toBe(201)

    // Attempt second registration with same email
    const duplicateUser = {
      ...testUser,
      firstName: 'Different',
      lastName: 'User',
      company: 'Different Company'
    }

    const secondResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateUser)
    })

    expect(secondResponse.status).toBe(409)

    const errorData = await secondResponse.json()
    expect(errorData).toHaveProperty('error')
    expect(errorData.error).toContain('already exists')
  })

  it('should reject login with incorrect password', async () => {
    // Register user first
    await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    })

    // Attempt login with wrong password
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'WrongPassword123!'
      })
    })

    expect(loginResponse.status).toBe(401)

    const errorData = await loginResponse.json()
    expect(errorData).toHaveProperty('error')
    expect(errorData.error).toContain('Invalid credentials')
  })

  it('should maintain session across multiple requests', async () => {
    // Register and login
    await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    })

    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    })

    const loginData = await loginResponse.json()
    const sessionToken = loginData.session.access_token

    // Make multiple authenticated requests
    const requests = [
      fetch('http://localhost:3000/api/projects', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      }),
      fetch('http://localhost:3000/api/projects', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      }),
      fetch('http://localhost:3000/api/projects', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      })
    ]

    const responses = await Promise.all(requests)

    responses.forEach(response => {
      expect(response.status).toBe(200)
    })
  })

  afterEach(async () => {
    // Clean up test user
    await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email })
    })
  })
})