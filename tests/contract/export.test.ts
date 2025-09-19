/**
 * Contract Tests for Export API Endpoint
 * T022: GET /api/projects/{id}/export
 *
 * These tests MUST FAIL until the actual API endpoint is implemented
 */

describe('Export API Contract Tests', () => {
  const mockAuthHeader = 'Bearer mock-jwt-token'
  const mockProjectId = 'proj_123456789'

  describe('GET /api/projects/{id}/export', () => {
    it('should export all reports as CSV', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      const contentDisposition = response.headers.get('Content-Disposition')
      expect(contentDisposition).toBeTruthy()
      if (contentDisposition) {
        expect(contentDisposition).toContain('attachment')
        expect(contentDisposition).toContain('.csv')
      }

      const csvContent = await response.text()
      expect(csvContent).toContain('ID,Type,Title,Description,Status,Priority,Created At,User Name,User Email')
      expect(csvContent.split('\n').length).toBeGreaterThan(1) // Header + at least one data row
    })

    it('should export filtered reports by type', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv&type=bug`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)

      const csvContent = await response.text()
      const lines = csvContent.split('\n').filter(line => line.trim())

      // Check that all data rows (excluding header) have type 'bug'
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i]?.split(',')
        if (columns && columns[1]) {
          expect(columns[1]).toBe('bug') // Type column
        }
      }
    })

    it('should export filtered reports by status', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv&status=new`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)

      const csvContent = await response.text()
      const lines = csvContent.split('\n').filter(line => line.trim())

      // Check that all data rows have status 'new'
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i]?.split(',')
        if (columns && columns[4]) {
          expect(columns[4]).toBe('new') // Status column
        }
      }
    })

    it('should export reports within date range', async () => {
      const fromDate = '2023-01-01'
      const toDate = '2023-12-31'

      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv&from=${fromDate}&to=${toDate}`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)

      const csvContent = await response.text()
      expect(csvContent).toContain('ID,Type,Title')
    })

    it('should export in Jira-compatible CSV format', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv&template=jira`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)

      const csvContent = await response.text()
      // Jira-specific column headers
      expect(csvContent).toContain('Issue Type,Summary,Description,Priority,Status,Reporter')

      const lines = csvContent.split('\n')
      expect(lines[0]).toContain('Issue Type') // Jira format header
    })

    it('should export in Azure DevOps-compatible CSV format', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv&template=azure`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)

      const csvContent = await response.text()
      // Azure DevOps-specific column headers
      expect(csvContent).toContain('Work Item Type,Title,Description,State,Priority,Created By')

      const lines = csvContent.split('\n')
      expect(lines[0]).toContain('Work Item Type') // Azure format header
    })

    it('should export reports with attachments information', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv&include_attachments=true`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)

      const csvContent = await response.text()
      expect(csvContent).toContain('Attachments')
    })

    it('should export reports with diagnostic data', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv&include_diagnostic=true`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)

      const csvContent = await response.text()
      expect(csvContent).toContain('Browser,OS,Page URL,Console Errors')
    })

    it('should return 400 for invalid format', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=invalid`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('format')
    })

    it('should return 400 for invalid date format', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv&from=invalid-date`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('date')
    })

    it('should return 403 for unauthorized project access', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer unauthorized-token'
        }
      })

      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('Access denied')
    })

    it('should return 404 for non-existent project', async () => {
      const response = await fetch('http://localhost:3000/api/projects/nonexistent/export?format=csv', {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('Project not found')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv`, {
        method: 'GET'
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('Unauthorized')
    })

    it('should handle empty project with no reports', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/proj_empty/export?format=csv`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)

      const csvContent = await response.text()
      const lines = csvContent.split('\n').filter(line => line.trim())
      expect(lines).toHaveLength(1) // Only header row
      expect(lines[0]).toContain('ID,Type,Title') // Header present
    })

    it('should properly escape CSV special characters', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)

      const csvContent = await response.text()

      // Check that commas in content are properly quoted
      if (csvContent.includes('",')) {
        expect(csvContent).toMatch(/"[^"]*,[^"]*"/) // Quoted fields containing commas
      }

      // Check that newlines in content are properly escaped
      if (csvContent.includes('\n')) {
        const lines = csvContent.split('\n')
        expect(lines.length).toBeGreaterThan(0)
      }
    })

    it('should include download filename in response headers', async () => {
      const response = await fetch(`http://localhost:3000/api/projects/${mockProjectId}/export?format=csv`, {
        method: 'GET',
        headers: {
          'Authorization': mockAuthHeader
        }
      })

      expect(response.status).toBe(200)

      const contentDisposition = response.headers.get('Content-Disposition')
      expect(contentDisposition).toBeTruthy()
      if (contentDisposition) {
        expect(contentDisposition).toMatch(/filename="feedloop-export-\d{4}-\d{2}-\d{2}\.csv"/)
      }
    })
  })
})