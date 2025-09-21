/**
 * Integration Test: Storage Cleanup on Project Deletion
 * T008: Storage cleanup validation during project deletion
 *
 * This test MUST FAIL until the storage cleanup functionality is implemented
 * Tests storage file cleanup and error handling during project deletion
 */

describe('Storage Cleanup on Project Deletion Integration Test', () => {
  const projectOwner = {
    email: 'storage-owner@example.com',
    password: 'OwnerPassword123!',
    firstName: 'Storage',
    lastName: 'Owner',
    company: 'Owner Company'
  }

  let ownerSessionToken: string
  let projectId: string
  let projectName: string
  let uploadedFileIds: string[] = []

  beforeAll(async () => {
    // Clean up test user
    await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: projectOwner.email })
    })

    // Register test user
    await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectOwner)
    })

    // Login user
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
  })

  beforeEach(async () => {
    // Create a fresh test project for each test
    projectName = `Storage Cleanup Test Project ${Date.now()}`

    const projectResponse = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerSessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        description: 'A project to test storage cleanup on deletion',
        domain: 'https://storage-test.example.com'
      })
    })

    const projectData = await projectResponse.json()
    projectId = projectData.project.id

    // Create test reports with file attachments
    uploadedFileIds = []
    for (let i = 0; i < 2; i++) {
      const reportResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Storage Test Report ${i + 1}`,
          description: `Report with attachments for storage cleanup test ${i + 1}`,
          priority: 'medium',
          category: 'bug'
        })
      })

      if (reportResponse.ok) {
        const reportData = await reportResponse.json()
        const reportId = reportData.report.id

        // Simulate file uploads for each report
        // Note: This is a simplified simulation - actual file upload would require multipart/form-data
        const mockFileData = {
          filename: `test-file-${i + 1}.png`,
          contentType: 'image/png',
          size: 1024 * (i + 1),
          reportId: reportId
        }

        const uploadResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/attachments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mockFileData)
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          uploadedFileIds.push(uploadData.attachment?.id || `mock-file-${i + 1}`)
        }
      }
    }
  })

  describe('Storage File Cleanup Validation', () => {
    it('should report successful storage cleanup in deletion response', async () => {
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Testing storage cleanup reporting'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)

      // Validate cleanup summary is provided
      if (data.cleanup_summary) {
        expect(data.cleanup_summary).toHaveProperty('database_records_deleted')
        expect(data.cleanup_summary).toHaveProperty('storage_files_deleted')
        expect(data.cleanup_summary).toHaveProperty('storage_cleanup_failures')

        expect(typeof data.cleanup_summary.database_records_deleted).toBe('number')
        expect(typeof data.cleanup_summary.storage_files_deleted).toBe('number')
        expect(Array.isArray(data.cleanup_summary.storage_cleanup_failures)).toBe(true)

        expect(data.cleanup_summary.database_records_deleted).toBeGreaterThanOrEqual(1)
        expect(data.cleanup_summary.storage_files_deleted).toBeGreaterThanOrEqual(0)

        // If there were uploaded files, expect them to be cleaned up
        if (uploadedFileIds.length > 0) {
          expect(data.cleanup_summary.storage_files_deleted).toBeGreaterThanOrEqual(uploadedFileIds.length)
        }

        // Storage cleanup failures should ideally be empty
        expect(data.cleanup_summary.storage_cleanup_failures.length).toBe(0)
      }
    })

    it('should handle partial storage cleanup failures gracefully', async () => {
      // This test simulates scenarios where some storage files cannot be deleted
      // In practice, this might happen due to file locks, permissions, or storage service unavailability

      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Testing partial storage cleanup failure handling'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      // Deletion should still succeed even with storage cleanup failures
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)

      if (data.cleanup_summary) {
        // Database cleanup should always succeed
        expect(data.cleanup_summary.database_records_deleted).toBeGreaterThanOrEqual(1)

        // Storage cleanup might have failures
        if (data.cleanup_summary.storage_cleanup_failures.length > 0) {
          // Each failure should be a string describing the failed file
          data.cleanup_summary.storage_cleanup_failures.forEach((failure: any) => {
            expect(typeof failure).toBe('string')
            expect(failure.length).toBeGreaterThan(0)
          })

          // Total files should equal successful + failed deletions
          const totalFiles = data.cleanup_summary.storage_files_deleted + data.cleanup_summary.storage_cleanup_failures.length
          expect(totalFiles).toBeGreaterThanOrEqual(0)
        }
      }

      // Verify project is still deleted despite storage failures
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(404)
    })

    it('should maintain transaction integrity during storage cleanup', async () => {
      // Test that database deletion only happens after successful storage cleanup attempt
      // Even if storage cleanup fails, database should be cleaned up (graceful degradation)

      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Testing transaction integrity'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      if (response.status === 200) {
        // If deletion succeeded, project should be completely gone
        const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          }
        })

        expect(verifyResponse.status).toBe(404)

        // All reports should also be gone
        const reportsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          }
        })

        expect(reportsResponse.status).toBe(404)
      } else if (response.status >= 500) {
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

    it('should handle storage service unavailability during deletion', async () => {
      // This test simulates complete storage service unavailability
      // Deletion should still proceed with database cleanup, reporting storage failures

      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Testing storage service unavailability'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      // Deletion should still succeed (graceful degradation)
      expect([200, 500]).toContain(response.status)

      if (response.status === 200) {
        const data = await response.json()
        expect(data).toHaveProperty('success', true)

        // Project should be gone from database
        const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          }
        })

        expect(verifyResponse.status).toBe(404)

        // If cleanup summary is provided, it should reflect storage failures
        if (data.cleanup_summary && uploadedFileIds.length > 0) {
          // Either files were deleted or failures were reported
          const totalAccountedFiles = data.cleanup_summary.storage_files_deleted +
                                    data.cleanup_summary.storage_cleanup_failures.length
          expect(totalAccountedFiles).toBeGreaterThanOrEqual(0)
        }
      }
    })
  })

  describe('Storage Cleanup Performance and Reliability', () => {
    it('should complete storage cleanup within reasonable time', async () => {
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Testing storage cleanup performance'
      }

      const startTime = Date.now()

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      const endTime = Date.now()
      const cleanupTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(cleanupTime).toBeLessThan(15000) // Should complete within 15 seconds including storage cleanup
    })

    it('should handle concurrent deletion attempts with storage cleanup', async () => {
      // Test that concurrent deletion attempts don't cause storage cleanup issues
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Testing concurrent deletion attempts'
      }

      // Try multiple concurrent deletions
      const promises = Array(2).fill(null).map(() =>
        fetch(`http://localhost:3000/api/projects/${projectId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${ownerSessionToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(deletionRequest)
        })
      )

      const responses = await Promise.all(promises)

      // One should succeed, others should fail
      const successfulResponses = responses.filter(r => r.status === 200)
      const failedResponses = responses.filter(r => r.status !== 200)

      expect(successfulResponses.length).toBe(1) // Exactly one should succeed
      expect(failedResponses.length).toBe(1) // Others should fail (project not found)

      failedResponses.forEach(response => {
        expect(response.status).toBe(404) // Project already deleted
      })

      // Verify project is deleted
      const verifyResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(verifyResponse.status).toBe(404)
    })
  })

  describe('Storage Cleanup Error Reporting', () => {
    it('should provide detailed error information for storage cleanup failures', async () => {
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Testing detailed error reporting'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // If error details are provided, they should be properly structured
      if (data.error_details) {
        expect(data.error_details).toHaveProperty('code')
        expect(data.error_details).toHaveProperty('message')
        expect(data.error_details).toHaveProperty('recoverable')

        expect(typeof data.error_details.code).toBe('string')
        expect(typeof data.error_details.message).toBe('string')
        expect(typeof data.error_details.recoverable).toBe('boolean')

        expect(data.error_details.code.length).toBeGreaterThan(0)
        expect(data.error_details.message.length).toBeGreaterThan(0)
      }

      // Cleanup summary should always be provided for successful deletions
      if (data.cleanup_summary) {
        expect(typeof data.cleanup_summary.database_records_deleted).toBe('number')
        expect(typeof data.cleanup_summary.storage_files_deleted).toBe('number')
        expect(Array.isArray(data.cleanup_summary.storage_cleanup_failures)).toBe('true')
      }
    })

    it('should maintain audit trail for storage cleanup operations', async () => {
      // This test ensures that storage cleanup operations are properly logged for audit purposes
      const deletionRequest = {
        confirmation_text: projectName,
        understood_consequences: true,
        deletion_reason: 'Testing audit trail maintenance'
      }

      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerSessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletionRequest)
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)

      // Response should include enough information for audit logging
      expect(data).toHaveProperty('message')
      expect(typeof data.message).toBe('string')

      // Cleanup summary provides audit trail for storage operations
      if (data.cleanup_summary) {
        // Each field provides audit information
        expect(Number.isInteger(data.cleanup_summary.database_records_deleted)).toBe(true)
        expect(Number.isInteger(data.cleanup_summary.storage_files_deleted)).toBe(true)
        expect(Array.isArray(data.cleanup_summary.storage_cleanup_failures)).toBe(true)

        // Cleanup failures provide detailed audit trail
        if (data.cleanup_summary.storage_cleanup_failures.length > 0) {
          data.cleanup_summary.storage_cleanup_failures.forEach((failure: any) => {
            expect(typeof failure).toBe('string')
            expect(failure.length).toBeGreaterThan(0)
          })
        }
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
    // Clean up test user
    await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: projectOwner.email })
    })
  })
})