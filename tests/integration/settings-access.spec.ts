/**
 * Integration Test: Settings Page Access Control
 * T005: Settings page access control scenarios
 *
 * This test MUST FAIL until the settings page and access control are implemented
 * Tests Scenario 1 and 2 from quickstart.md: Settings Page Access and Access Control Validation
 */

describe('Settings Page Access Control Integration Test', () => {
  const projectOwner = {
    email: 'settings-owner@example.com',
    password: 'OwnerPassword123!',
    firstName: 'Settings',
    lastName: 'Owner',
    company: 'Owner Company'
  }

  const teamMember = {
    email: 'settings-member@example.com',
    password: 'MemberPassword123!',
    firstName: 'Settings',
    lastName: 'Member',
    company: 'Member Company'
  }

  const externalUser = {
    email: 'external@example.com',
    password: 'ExternalPassword123!',
    firstName: 'External',
    lastName: 'User',
    company: 'External Company'
  }

  let ownerSessionToken: string
  let memberSessionToken: string
  let externalSessionToken: string
  let projectId: string

  beforeAll(async () => {
    // Clean up test users
    await Promise.all([
      fetch('http://localhost:3000/api/test/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: projectOwner.email })
      }),
      fetch('http://localhost:3000/api/test/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: teamMember.email })
      }),
      fetch('http://localhost:3000/api/test/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: externalUser.email })
      })
    ])

    // Register test users
    await Promise.all([
      fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectOwner)
      }),
      fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamMember)
      }),
      fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(externalUser)
      })
    ])

    // Login all users
    const [ownerLogin, memberLogin, externalLogin] = await Promise.all([
      fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: projectOwner.email,
          password: projectOwner.password
        })
      }),
      fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: teamMember.email,
          password: teamMember.password
        })
      }),
      fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: externalUser.email,
          password: externalUser.password
        })
      })
    ])

    const ownerData = await ownerLogin.json()
    const memberData = await memberLogin.json()
    const externalData = await externalLogin.json()

    ownerSessionToken = ownerData.session.access_token
    memberSessionToken = memberData.session.access_token
    externalSessionToken = externalData.session.access_token

    // Create a test project as owner
    const projectResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Settings Access Test Project',
        description: 'A project to test settings access control',
        domain: 'https://settings-test.example.com'
      })
    })

    const projectData = await projectResponse.json()
    projectId = projectData.project.id

    // Invite team member to project
    const inviteResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/invitations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: teamMember.email,
        role: 'member'
      })
    })

    const inviteData = await inviteResponse.json()
    const invitationId = inviteData.invitation.id

    // Accept invitation as team member
    await fetch(`http://localhost:3000/api/invitations/${invitationId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${memberSessionToken}`,
        'Content-Type': 'application/json'
      }
    })
  })

  describe('Scenario 1: Settings Page Access for Project Owner', () => {
    it('should allow project owner to access settings API endpoint', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // Validate settings data structure
      expect(data).toHaveProperty('project')
      expect(data).toHaveProperty('statistics')
      expect(data).toHaveProperty('permissions')

      // Validate project information
      expect(data.project).toHaveProperty('id', projectId)
      expect(data.project).toHaveProperty('name', 'Settings Access Test Project')
      expect(data.project).toHaveProperty('owner_id')

      // Validate statistics are present and valid
      expect(data.statistics).toHaveProperty('member_count')
      expect(data.statistics).toHaveProperty('report_count')
      expect(data.statistics).toHaveProperty('attachment_count')
      expect(data.statistics).toHaveProperty('export_template_count')
      expect(data.statistics).toHaveProperty('total_storage_usage')
      expect(data.statistics.member_count).toBeGreaterThanOrEqual(2) // Owner + member

      // Validate permissions for owner
      expect(data.permissions).toHaveProperty('can_delete', true)
      expect(data.permissions).toHaveProperty('can_modify', true)
    })

    it('should return accurate project statistics for owner', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // Validate statistics accuracy by cross-checking with other endpoints
      const projectDetailResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      const projectDetail = await projectDetailResponse.json()

      // Member count should match team members
      expect(data.statistics.member_count).toBe(projectDetail.project.team_members.length)

      // All counts should be non-negative integers
      expect(Number.isInteger(data.statistics.member_count)).toBe(true)
      expect(Number.isInteger(data.statistics.report_count)).toBe(true)
      expect(Number.isInteger(data.statistics.attachment_count)).toBe(true)
      expect(Number.isInteger(data.statistics.export_template_count)).toBe(true)
      expect(Number.isInteger(data.statistics.total_storage_usage)).toBe(true)

      expect(data.statistics.member_count).toBeGreaterThanOrEqual(0)
      expect(data.statistics.report_count).toBeGreaterThanOrEqual(0)
      expect(data.statistics.attachment_count).toBeGreaterThanOrEqual(0)
      expect(data.statistics.export_template_count).toBeGreaterThanOrEqual(0)
      expect(data.statistics.total_storage_usage).toBeGreaterThanOrEqual(0)
    })

    it('should validate response performance for owner access', async () => {
      const startTime = Date.now()

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(200) // Performance target: <200ms
    })
  })

  describe('Scenario 2: Access Control Validation for Non-Owners', () => {
    it('should deny settings access to team members (non-owners)', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${memberSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toMatch(/access denied|forbidden|owner|permission/)
    })

    it('should deny settings access to external users', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${externalSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toMatch(/access denied|forbidden|owner|permission/)
    })

    it('should deny settings access to unauthenticated requests', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toMatch(/authentication|unauthorized|login/)
    })

    it('should deny settings access with invalid authentication token', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token-here',
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
    })

    it('should deny settings access for non-existent projects', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await fetch(`http://localhost:3000/api/projects/${nonExistentId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toMatch(/not found|project.*not.*found/)
    })

    it('should handle malformed project IDs gracefully', async () => {
      const invalidId = 'invalid-uuid-format'

      const response = await fetch(`http://localhost:3000/api/projects/${invalidId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect([400, 404]).toContain(response.status)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
    })
  })

  describe('Access Control Consistency Across User Types', () => {
    it('should maintain consistent access control when ownership changes', async () => {
      // This test would be relevant if ownership transfer was implemented
      // For now, we test that only the original owner has access

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.permissions.can_delete).toBe(true)
      expect(data.permissions.can_modify).toBe(true)
    })

    it('should validate that settings endpoint enforces server-side access control', async () => {
      // Try to access settings with member token but owner project ID
      // This ensures access control is enforced server-side, not just client-side

      const memberResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${memberSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(memberResponse.status).toBe(403)

      // Verify owner still has access
      const ownerResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(ownerResponse.status).toBe(200)
    })

    it('should not expose sensitive data in error responses', async () => {
      // Test with member trying to access settings
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${memberSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(403)

      const data = await response.json()

      // Error response should not contain sensitive project information
      const responseText = JSON.stringify(data)
      expect(responseText).not.toContain('integration_key')
      expect(responseText).not.toContain('owner_id')
      expect(responseText).not.toContain('Settings Access Test Project')
    })
  })

  afterAll(async () => {
    // Clean up test users and projects
    await Promise.all([
      fetch('http://localhost:3000/api/test/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: projectOwner.email })
      }),
      fetch('http://localhost:3000/api/test/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: teamMember.email })
      }),
      fetch('http://localhost:3000/api/test/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: externalUser.email })
      })
    ])
  })
})