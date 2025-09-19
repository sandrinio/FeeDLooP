/**
 * Integration Test: Project Creation and Team Invitation
 * T024: Complete project management and team collaboration flow
 *
 * This test MUST FAIL until the actual project management system is implemented
 */

describe('Project Management Integration Test', () => {
  const projectOwner = {
    email: 'owner@example.com',
    password: 'OwnerPassword123!',
    firstName: 'Project',
    lastName: 'Owner',
    company: 'Owner Company'
  }

  const teamMember = {
    email: 'member@example.com',
    password: 'MemberPassword123!',
    firstName: 'Team',
    lastName: 'Member',
    company: 'Member Company'
  }

  let ownerSessionToken: string
  let memberSessionToken: string
  let projectId: string
  let integrationKey: string

  beforeAll(async () => {
    // Set up test users
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

    // Register both users
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

  it('should complete full project creation and team management flow', async () => {
    // Step 1: Owner creates a new project
    const projectData = {
      name: 'Team Collaboration Project',
      description: 'A project to test team collaboration features',
      domain: 'https://collaboration-test.com'
    }

    const createResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    })

    expect(createResponse.status).toBe(201)

    const createData = await createResponse.json()
    projectId = createData.project.id
    integrationKey = createData.project.integration_key

    expect(createData.project).toHaveProperty('name', projectData.name)
    expect(createData.project).toHaveProperty('description', projectData.description)
    expect(createData.project).toHaveProperty('domain', projectData.domain)

    // Step 2: Verify project appears in owner's project list
    const ownerProjectsResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(ownerProjectsResponse.status).toBe(200)

    const ownerProjects = await ownerProjectsResponse.json()
    expect(ownerProjects.projects).toHaveLength(1)
    expect(ownerProjects.projects[0].id).toBe(projectId)

    // Step 3: Verify project does NOT appear in team member's project list initially
    const memberProjectsResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${memberSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(memberProjectsResponse.status).toBe(200)

    const memberProjects = await memberProjectsResponse.json()
    expect(memberProjects.projects).toHaveLength(0)

    // Step 4: Owner invites team member to the project
    const invitationData = {
      email: teamMember.email,
      role: 'member'
    }

    const inviteResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/invitations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invitationData)
    })

    expect(inviteResponse.status).toBe(201)

    const inviteData = await inviteResponse.json()
    expect(inviteData).toHaveProperty('invitation')
    expect(inviteData.invitation).toHaveProperty('email', teamMember.email)
    expect(inviteData.invitation).toHaveProperty('role', 'member')
    expect(inviteData.invitation).toHaveProperty('status', 'pending')
    expect(inviteData).toHaveProperty('email_sent', true)

    const invitationId = inviteData.invitation.id

    // Step 5: Simulate invitation acceptance (team member gains access)
    const acceptResponse = await fetch(`http://localhost:3000/api/invitations/${invitationId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${memberSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(acceptResponse.status).toBe(200)

    // Step 6: Verify project now appears in team member's project list
    const updatedMemberProjectsResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${memberSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(updatedMemberProjectsResponse.status).toBe(200)

    const updatedMemberProjects = await updatedMemberProjectsResponse.json()
    expect(updatedMemberProjects.projects).toHaveLength(1)
    expect(updatedMemberProjects.projects[0].id).toBe(projectId)

    // Step 7: Both users can access project details
    const [ownerDetailsResponse, memberDetailsResponse] = await Promise.all([
      fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${memberSessionToken}`,
          'Content-Type': 'application/json'
        }
      })
    ])

    expect(ownerDetailsResponse.status).toBe(200)
    expect(memberDetailsResponse.status).toBe(200)

    const ownerDetails = await ownerDetailsResponse.json()
    const memberDetails = await memberDetailsResponse.json()

    // Both should see the same project with 2 team members
    expect(ownerDetails.project.team_members).toHaveLength(2)
    expect(memberDetails.project.team_members).toHaveLength(2)

    const teamMembers = ownerDetails.project.team_members
    const ownerMember = teamMembers.find((m: any) => m.email === projectOwner.email)
    const invitedMember = teamMembers.find((m: any) => m.email === teamMember.email)

    expect(ownerMember).toHaveProperty('role', 'owner')
    expect(invitedMember).toHaveProperty('role', 'member')

    // Step 8: Owner can update project settings
    const updateData = {
      name: 'Updated Team Project',
      description: 'Updated description for team collaboration',
      domain: 'https://updated-collaboration.com'
    }

    const updateResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })

    expect(updateResponse.status).toBe(200)

    const updateResponseData = await updateResponse.json()
    expect(updateResponseData.project).toHaveProperty('name', updateData.name)
    expect(updateResponseData.project).toHaveProperty('description', updateData.description)

    // Step 9: Team member cannot update project settings (permission test)
    const memberUpdateResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${memberSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Member Attempted Update' })
    })

    expect(memberUpdateResponse.status).toBe(403)

    // Step 10: Both users can view project reports
    const [ownerReportsResponse, memberReportsResponse] = await Promise.all([
      fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${memberSessionToken}`,
          'Content-Type': 'application/json'
        }
      })
    ])

    expect(ownerReportsResponse.status).toBe(200)
    expect(memberReportsResponse.status).toBe(200)

    // Step 11: Owner removes team member from project
    const removeResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/invitations`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: teamMember.email })
    })

    expect(removeResponse.status).toBe(200)

    // Step 12: Verify team member no longer has access
    const finalMemberAccessResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${memberSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(finalMemberAccessResponse.status).toBe(403)

    // Step 13: Verify project no longer appears in member's project list
    const finalMemberProjectsResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${memberSessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(finalMemberProjectsResponse.status).toBe(200)

    const finalMemberProjects = await finalMemberProjectsResponse.json()
    expect(finalMemberProjects.projects).toHaveLength(0)
  })

  it('should prevent non-owner from inviting team members', async () => {
    // Create project as owner
    const projectResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Owner Only Project',
        description: 'Testing owner permissions'
      })
    })

    const projectData = await projectResponse.json()
    const testProjectId = projectData.project.id

    // Invite member first
    await fetch(`http://localhost:3000/api/projects/${testProjectId}/invitations`, {
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

    // Accept invitation
    // (This would require invitation acceptance flow - simplified for test)

    // Member attempts to invite another user
    const memberInviteResponse = await fetch(`http://localhost:3000/api/projects/${testProjectId}/invitations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${memberSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'anothermember@example.com',
        role: 'member'
      })
    })

    expect(memberInviteResponse.status).toBe(403)
  })

  it('should handle duplicate invitations gracefully', async () => {
    // Create project
    const projectResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Duplicate Invitation Test',
        description: 'Testing duplicate invitation handling'
      })
    })

    const projectData = await projectResponse.json()
    const testProjectId = projectData.project.id

    // Send first invitation
    const firstInviteResponse = await fetch(`http://localhost:3000/api/projects/${testProjectId}/invitations`, {
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

    expect(firstInviteResponse.status).toBe(201)

    // Attempt second invitation to same email
    const secondInviteResponse = await fetch(`http://localhost:3000/api/projects/${testProjectId}/invitations`, {
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

    expect(secondInviteResponse.status).toBe(409)

    const errorData = await secondInviteResponse.json()
    expect(errorData).toHaveProperty('error')
    expect(errorData.error).toContain('already invited')
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
      })
    ])
  })
})