/**
 * Integration Test: Project Deletion Happy Path
 * T006: Project deletion happy path flow
 *
 * This test MUST FAIL until the enhanced deletion functionality is implemented
 * Tests Scenario 3 from quickstart.md: Project Deletion - Happy Path
 */

describe('Project Deletion Happy Path Integration Test', () => {
  const projectOwner = {
    email: 'deletion-owner@example.com',
    password: 'OwnerPassword123!',
    firstName: 'Deletion',
    lastName: 'Owner',
    company: 'Owner Company'
  }

  const teamMember = {
    email: 'deletion-member@example.com',
    password: 'MemberPassword123!',
    firstName: 'Deletion',
    lastName: 'Member',
    company: 'Member Company'
  }

  let ownerSessionToken: string
  let memberSessionToken: string
  let projectId: string
  let projectName: string
  let reportIds: string[] = []

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
      })
    ])

    // Login both users
    const [ownerLogin, memberLogin] = await Promise.all([
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
      })
    ])

    const ownerData = await ownerLogin.json()
    const memberData = await memberLogin.json()

    ownerSessionToken = ownerData.session.access_token
    memberSessionToken = memberData.session.access_token
  })

  beforeEach(async () => {
    // Create a fresh test project for each test
    projectName = `Deletion Test Project ${Date.now()}`

    const projectResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        description: 'A project to test deletion functionality',
        domain: 'https://deletion-test.example.com'
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

    // Create some test reports and attachments to verify complete cleanup
    reportIds = []
    for (let i = 0; i < 3; i++) {
      const reportResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Test Report ${i + 1}`,
          description: `Description for test report ${i + 1}`,
          priority: 'medium',
          category: 'bug'
        })
      })

      if (reportResponse.ok) {
        const reportData = await reportResponse.json()
        reportIds.push(reportData.report.id)
      }
    }
  })

  describe('Complete Project Deletion Flow', () => {
    it('should successfully delete project with all associated data', async () => {
      // Step 1: Verify project exists and has data
      const preDeleteProjectResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(preDeleteProjectResponse.status).toBe(200)

      const preDeleteProject = await preDeleteProjectResponse.json()
      expect(preDeleteProject.project.team_members.length).toBeGreaterThanOrEqual(2) // Owner + member

      // Step 2: Get project reports before deletion
      const preDeleteReportsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(preDeleteReportsResponse.status).toBe(200)

      const preDeleteReports = await preDeleteReportsResponse.json()
      const reportCount = preDeleteReports.reports ? preDeleteReports.reports.length : 0

      // Step 3: Perform deletion with proper confirmation
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Integration test for deletion functionality'
      }

      const deleteResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      // Step 4: Verify successful deletion response
      expect(deleteResponse.status).toBe(200)

      const deleteData = await deleteResponse.json()
      expect(deleteData).toHaveProperty('success', true)
      expect(deleteData).toHaveProperty('message')
      expect(typeof deleteData.message).toBe('string')

      // Step 5: Verify cleanup summary if provided
      if (deleteData.cleanup_summary) {
        expect(deleteData.cleanup_summary).toHaveProperty('database_records_deleted')
        expect(deleteData.cleanup_summary).toHaveProperty('storage_files_deleted')
        expect(deleteData.cleanup_summary).toHaveProperty('storage_cleanup_failures')

        expect(deleteData.cleanup_summary.database_records_deleted).toBeGreaterThanOrEqual(1) // At least project record
        expect(deleteData.cleanup_summary.storage_files_deleted).toBeGreaterThanOrEqual(0)
        expect(Array.isArray(deleteData.cleanup_summary.storage_cleanup_failures)).toBe(true)
      }

      // Step 6: Verify project no longer exists
      const postDeleteProjectResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(postDeleteProjectResponse.status).toBe(404)

      // Step 7: Verify project not in owner's project list
      const ownerProjectsResponse = await fetch('http://localhost:3000/api/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(ownerProjectsResponse.status).toBe(200)

      const ownerProjects = await ownerProjectsResponse.json()
      const projectExists = ownerProjects.projects.some((p: any) => p.id === projectId)
      expect(projectExists).toBe(false)

      // Step 8: Verify project not in member's project list
      const memberProjectsResponse = await fetch('http://localhost:3000/api/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${memberSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(memberProjectsResponse.status).toBe(200)

      const memberProjects = await memberProjectsResponse.json()
      const memberProjectExists = memberProjects.projects.some((p: any) => p.id === projectId)
      expect(memberProjectExists).toBe(false)

      // Step 9: Verify all reports are deleted
      const postDeleteReportsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(postDeleteReportsResponse.status).toBe(404) // Project doesn't exist, so reports endpoint should return 404

      // Step 10: Verify individual report access is denied
      for (const reportId of reportIds) {
        const reportResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports/${reportId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          }
        })

        expect([404, 403]).toContain(reportResponse.status) // Either not found or access denied
      }
    })

    it('should handle deletion performance within acceptable timeframe', async () => {
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Performance test for deletion'
      }

      const startTime = Date.now()

      const deleteResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      const endTime = Date.now()
      const deletionTime = endTime - startTime

      expect(deleteResponse.status).toBe(200)
      expect(deletionTime).toBeLessThan(10000) // Should complete within 10 seconds for typical project
    })

    it('should maintain data integrity during deletion process', async () => {
      // Create another project to ensure deletion doesn't affect other projects
      const otherProjectResponse = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Control Project',
          description: 'Project that should not be affected by deletion',
          domain: 'https://control.example.com'
        })
      })

      const otherProjectData = await otherProjectResponse.json()
      const otherProjectId = otherProjectData.project.id

      // Delete the test project
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Data integrity test'
      }

      const deleteResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(deleteResponse.status).toBe(200)

      // Verify the other project still exists and is accessible
      const controlProjectResponse = await fetch(`http://localhost:3000/api/projects/${otherProjectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(controlProjectResponse.status).toBe(200)

      const controlProject = await controlProjectResponse.json()
      expect(controlProject.project.id).toBe(otherProjectId)
      expect(controlProject.project.name).toBe('Control Project')

      // Clean up control project
      await fetch(`http://localhost:3000/api/projects/${otherProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmation_text: 'Control Project',
          understood_consequences: true
        })
      })
    })

    it('should prevent duplicate deletion attempts', async () => {
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'First deletion attempt'
      }

      // First deletion
      const firstDeleteResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(firstDeleteResponse.status).toBe(200)

      // Second deletion attempt should fail
      const secondDeleteResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(secondDeleteResponse.status).toBe(404) // Project no longer exists

      const secondDeleteData = await secondDeleteResponse.json()
      expect(secondDeleteData).toHaveProperty('error')
      expect(typeof secondDeleteData.error).toBe('string')
    })

    it('should validate deletion operation is atomic', async () => {
      // This test ensures that if deletion fails, no partial state remains
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Atomicity test'
      }

      const deleteResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      if (deleteResponse.status === 200) {
        // If deletion succeeded, everything should be gone
        const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          }
        })

        expect(verifyResponse.status).toBe(404)
      } else if (deleteResponse.status >= 500) {
        // If deletion failed due to server error, project should still exist intact
        const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          }
        })

        expect(verifyResponse.status).toBe(200)

        const projectData = await verifyResponse.json()
        expect(projectData.project.name).toBe(projectName)
      }
    })
  })

  afterEach(async () => {
    // Clean up any remaining test project if deletion test failed
    try {
      await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmation_text: projectName,
          understood_consequences: true,
          deletion_reason: 'Test cleanup'
        })
      })
    } catch {
      // Ignore cleanup errors
    }
  })

  afterAll(async () => {
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
      })
    ])
  })
})