/**
 * Integration Test: File Upload and Attachment Handling
 * T027: Complete file management workflow
 *
 * This test MUST FAIL until the actual file management system is implemented
 */

describe('File Management Integration Test', () => {
  const user = {
    email: 'fileuser@example.com',
    password: 'FilePass123!',
    firstName: 'File',
    lastName: 'User',
    company: 'File Co'
  }

  let sessionToken: string
  let projectId: string
  let integrationKey: string

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
        name: 'File Management Test',
        description: 'Testing file uploads'
      })
    })

    const projectData = await projectResponse.json()
    projectId = projectData.project.id
    integrationKey = projectData.project.integration_key
  })

  it('should complete full file management workflow', async () => {
    // Step 1: Upload files via dashboard
    const formData = new FormData()
    const blob1 = new Blob(['test image 1'], { type: 'image/png' })
    const blob2 = new Blob(['test image 2'], { type: 'image/jpeg' })

    formData.append('files', blob1, 'test1.png')
    formData.append('files', blob2, 'test2.jpg')
    formData.append('project_id', projectId)

    const uploadResponse = await fetch('http://localhost:3000/api/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      },
      body: formData
    })

    expect(uploadResponse.status).toBe(201)

    const uploadData = await uploadResponse.json()
    expect(uploadData.files).toHaveLength(2)

    // Step 2: Submit widget report with attachments
    const reportWithAttachments = {
      project_key: integrationKey,
      type: 'bug',
      title: 'UI issue with screenshots',
      description: 'Found a visual bug, attaching screenshots',
      user_info: { name: 'Bug Reporter', email: 'bug@example.com' },
      attachments: [
        {
          filename: 'bug-screenshot.png',
          content_type: 'image/png',
          size: 12345,
          base64_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        }
      ]
    }

    const reportResponse = await fetch('http://localhost:3000/api/widget/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportWithAttachments)
    })

    expect(reportResponse.status).toBe(201)

    const reportData = await reportResponse.json()
    expect(reportData.report.attachments).toHaveLength(1)

    // Step 3: Verify files are accessible
    const reportId = reportData.report.id
    const reportDetailsResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/reports/${reportId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    const reportDetails = await reportDetailsResponse.json()
    expect(reportDetails.report.attachments[0]).toHaveProperty('url')

    // Step 4: Test file download
    const fileUrl = reportDetails.report.attachments[0].url
    const downloadResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    })

    expect(downloadResponse.status).toBe(200)
  })

  afterAll(async () => {
    await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    })
  })
})