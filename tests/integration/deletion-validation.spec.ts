/**
 * Integration Test: Project Deletion Validation Errors
 * T007: Project deletion validation error scenarios
 *
 * This test MUST FAIL until the enhanced deletion validation is implemented
 * Tests Scenario 4 from quickstart.md: Project Deletion - Validation Errors
 */

describe('Project Deletion Validation Errors Integration Test', () => {
  const projectOwner = {
    email: 'validation-owner@example.com',
    password: 'OwnerPassword123!',
    firstName: 'Validation',
    lastName: 'Owner',
    company: 'Owner Company'
  }

  const teamMember = {
    email: 'validation-member@example.com',
    password: 'MemberPassword123!',
    firstName: 'Validation',
    lastName: 'Member',
    company: 'Member Company'
  }

  let ownerSessionToken: string
  let memberSessionToken: string
  let projectId: string
  let projectName: string

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

    // Create a test project
    projectName = 'Validation Test Project'

    const projectResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        description: 'A project to test deletion validation',
        domain: 'https://validation-test.example.com'
      })
    })

    const projectData = await projectResponse.json()
    projectId = projectData.project.id
  })

  describe('Project Name Confirmation Validation', () => {
    it('should reject deletion with empty confirmation text', async () => {
      const deletionRequest = {
        confirmation_text: '',
        understood_consequences: true,
        deletion_reason: 'Testing empty confirmation'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toMatch(/confirmation.*required|enter.*project.*name/)

      // Verify project still exists
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })

    it('should reject deletion with incorrect project name', async () => {
      const deletionRequest = {
        confirmation_text: 'Wrong Project Name',
        understood_consequences: true,
        deletion_reason: 'Testing incorrect project name'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toMatch(/project.*name|confirmation.*text|exactly/)

      // Verify project still exists
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })

    it('should reject deletion with case-sensitive project name mismatch', async () => {
      const deletionRequest = {
        confirmation_text: projectName.toLowerCase(), // Case mismatch
        understood_consequences: true,
        deletion_reason: 'Testing case sensitivity'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')

      // Verify project still exists
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })

    it('should reject deletion with extra whitespace in project name', async () => {
      const deletionRequest = {
        confirmation_text: ` ${projectName} `, // Extra whitespace
        understood_consequences: true,
        deletion_reason: 'Testing whitespace handling'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      // This should either pass (if whitespace is trimmed) or fail with 400
      if (response.status === 400) {
        const data = await response.json()
        expect(data).toHaveProperty('error')
        expect(typeof data.error).toBe('string')

        // Verify project still exists if validation failed
        const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          }
        })

        expect(verifyResponse.status).toBe(200)
      } else {
        // If deletion succeeded with trimmed whitespace, that's acceptable behavior
        expect(response.status).toBe(200)
      }
    })
  })

  describe('Consequences Acknowledgment Validation', () => {
    it('should reject deletion without consequences acknowledgment', async () => {
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: false,
        deletion_reason: 'Testing consequences requirement'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toMatch(/consequences|acknowledge|understand/)

      // Verify project still exists
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })

    it('should reject deletion with missing understood_consequences field', async () => {
      const deletionRequest = {
        confirmation_text: projectName,
        deletion_reason: 'Testing missing consequences field'
        // understood_consequences field intentionally omitted
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')

      // Verify project still exists
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })
  })

  describe('Deletion Reason Validation', () => {
    it('should reject deletion with overly long deletion reason', async () => {
      const longReason = 'A'.repeat(501) // Exceeds 500 character limit

      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: longReason
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toMatch(/reason.*length|character.*limit|500/)

      // Verify project still exists
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })

    it('should accept deletion with maximum length deletion reason', async () => {
      const maxLengthReason = 'A'.repeat(500) // Exactly 500 characters

      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: maxLengthReason
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      // This should either succeed (200) or fail for other reasons (not 400 due to length)
      if (response.status !== 200) {
        expect(response.status).not.toBe(400) // Should not fail due to length validation

        // If it fails for other reasons, project should still exist
        const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          }
        })

        expect(verifyResponse.status).toBe(200)
      }
    })

    it('should accept deletion with no deletion reason (optional field)', async () => {
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true
        // deletion_reason intentionally omitted (optional field)
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      // This should either succeed (200) or fail for reasons other than missing optional field
      if (response.status !== 200) {
        expect(response.status).not.toBe(400) // Should not fail due to missing optional field

        // If it fails for other reasons, project should still exist
        const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          }
        })

        expect(verifyResponse.status).toBe(200)
      }
    })
  })

  describe('Request Body Validation', () => {
    it('should reject deletion with malformed JSON', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: 'invalid json syntax {'
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')

      // Verify project still exists
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })

    it('should reject deletion with missing required fields', async () => {
      const incompleteRequest = {
        // confirmation_text and understood_consequences missing
        deletion_reason: 'Testing incomplete request'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(incompleteRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')

      // Verify project still exists
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })

    it('should reject deletion with invalid field types', async () => {
      const invalidTypeRequest = {
        confirmation_text: 123, // Should be string
        understood_consequences: 'true', // Should be boolean
        deletion_reason: ['array', 'instead', 'of', 'string'] // Should be string
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidTypeRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')

      // Verify project still exists
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })
  })

  describe('Client-Side vs Server-Side Validation Consistency', () => {
    it('should enforce server-side validation even with client-side bypass attempts', async () => {
      // Test that server-side validation cannot be bypassed
      const bypassAttempt = {
        confirmation_text: 'Wrong Name',
        understood_consequences: true,
        deletion_reason: 'Attempting to bypass validation',
        _bypass_validation: true, // Invalid field that might be used in bypass attempts
        admin_override: true // Another potential bypass field
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bypassAttempt)
      })

      expect(response.status).toBe(400) // Should still validate despite extra fields

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')

      // Verify project still exists
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })

    it('should maintain validation consistency across multiple attempts', async () => {
      // Multiple rapid validation attempts should all fail consistently
      const invalidRequest = {
        confirmation_text: 'Invalid Name',
        understood_consequences: true
      }

      const promises = Array(3).fill(null).map(() =>
        fetch(`http://localhost:3000/api/projects/${projectId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invalidRequest)
        })
      )

      const responses = await Promise.all(promises)

      // All should fail with 400
      responses.forEach(response => {
        expect(response.status).toBe(400)
      })

      // Verify project still exists after all attempts
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(200)
    })
  })

  afterAll(async () => {
    // Clean up test project if it still exists
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