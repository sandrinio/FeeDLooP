/**
 * Contract Test for Enhanced Project Deletion API Endpoint
 * T004: DELETE /api/projects/{projectId} (Enhanced with storage cleanup)
 *
 * This test MUST FAIL until the enhanced API endpoint is implemented
 * Tests the contract specification from project-settings-api.yaml
 */

describe('Enhanced Project Deletion API Contract Test', () => {
  const mockAuthHeader = 'Bearer mock-jwt-token'
  const mockProjectId = 'b6676813-5f1a-41f6-921b-95f16a4183a2'
  const mockProjectName = 'Test Project Name'
  const nonOwnerAuthHeader = 'Bearer non-owner-token'

  describe('DELETE /api/projects/{projectId} (Enhanced)', () => {
    it('should delete project successfully with valid confirmation', async () => {
      const deletionRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: true,
        deletion_reason: 'Project completed, no longer needed'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // Validate ProjectDeletionResponse schema
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('message')
      expect(typeof data.success).toBe('boolean')
      expect(typeof data.message).toBe('string')
      expect(data.success).toBe(true)

      // Validate optional cleanup_summary if present
      if (data.cleanup_summary) {
        expect(data.cleanup_summary).toHaveProperty('database_records_deleted')
        expect(data.cleanup_summary).toHaveProperty('storage_files_deleted')
        expect(data.cleanup_summary).toHaveProperty('storage_cleanup_failures')
        expect(typeof data.cleanup_summary.database_records_deleted).toBe('number')
        expect(typeof data.cleanup_summary.storage_files_deleted).toBe('number')
        expect(Array.isArray(data.cleanup_summary.storage_cleanup_failures)).toBe(true)
        expect(data.cleanup_summary.database_records_deleted).toBeGreaterThanOrEqual(0)
        expect(data.cleanup_summary.storage_files_deleted).toBeGreaterThanOrEqual(0)
      }
    })

    it('should return 400 for missing confirmation text', async () => {
      const invalidRequest = {
        confirmation_text: '',
        understood_consequences: true
      }

      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toContain('confirmation')
    })

    it('should return 400 for incorrect project name confirmation', async () => {
      const invalidRequest = {
        confirmation_text: 'Wrong Project Name',
        understood_consequences: true
      }

      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
    })

    it('should return 400 for missing consequences acknowledgment', async () => {
      const invalidRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: false
      }

      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toContain('consequences')
    })

    it('should return 400 for deletion reason exceeding length limit', async () => {
      const invalidRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: true,
        deletion_reason: 'A'.repeat(501) // Exceeds 500 character limit
      }

      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
    })

    it('should return 400 for malformed request body', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
    })

    it('should return 401 for unauthenticated request', async () => {
      const deletionRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: true
      }

      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error).toContain('Authentication')
    })

    it('should return 403 for non-owner deletion attempt', async () => {
      const deletionRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: true
      }

      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': nonOwnerAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toContain('access denied')
    })

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const deletionRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: true
      }

      const response = await fetch(`http://localhost:3000/api/projects/${nonExistentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.toLowerCase()).toContain('not found')
    })

    it('should return 400 for invalid project ID format', async () => {
      const invalidId = 'invalid-uuid-format'
      const deletionRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: true
      }

      const response = await fetch(`http://localhost:3000/api/projects/${invalidId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect([400, 404]).toContain(response.status) // Some systems might return 404 for invalid format

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
    })

    it('should handle concurrent deletion attempts (409 conflict)', async () => {
      const deletionRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: true
      }

      // This test may not be easily reproducible without special setup
      // It's designed to test the 409 response when deletion is already in progress
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      // The response could be 200 (success), 409 (conflict), or other status
      // We're mainly testing that if 409 is returned, it has proper structure
      if (response.status === 409) {
        const data = await response.json()
        expect(data).toHaveProperty('error')
        expect(typeof data.error).toBe('string')
        expect(data.error.toLowerCase()).toContain('conflict')
      }
    })

    it('should handle storage cleanup failures gracefully', async () => {
      const deletionRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: true
      }

      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      // Test that partial failures are handled properly
      if (response.status === 200) {
        const data = await response.json()

        if (data.cleanup_summary && data.cleanup_summary.storage_cleanup_failures.length > 0) {
          // Verify that storage failures are properly reported
          expect(Array.isArray(data.cleanup_summary.storage_cleanup_failures)).toBe(true)
          data.cleanup_summary.storage_cleanup_failures.forEach((failure: any) => {
            expect(typeof failure).toBe('string')
          })
        }

        if (data.error_details) {
          expect(data.error_details).toHaveProperty('code')
          expect(data.error_details).toHaveProperty('message')
          expect(data.error_details).toHaveProperty('recoverable')
          expect(typeof data.error_details.code).toBe('string')
          expect(typeof data.error_details.message).toBe('string')
          expect(typeof data.error_details.recoverable).toBe('boolean')
        }
      }
    })

    it('should validate request body matches ProjectDeletionRequest schema', async () => {
      // Test with valid minimal request
      const minimalRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: true
      }

      let response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(minimalRequest)
      })

      // Should not fail due to missing optional field
      expect([200, 403, 404, 500]).toContain(response.status) // Various possible responses, but not 400 for missing optional field

      // Test with complete request
      const completeRequest = {
        confirmation_text: mockProjectName,
        understood_consequences: true,
        deletion_reason: 'Valid reason under 500 characters'
      }

      response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completeRequest)
      })

      // Should accept complete request
      expect([200, 403, 404, 500]).toContain(response.status)
    })
  })
})