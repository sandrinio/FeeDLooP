import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should redirect to login when accessing dashboard without authentication', async ({ page }) => {
    await page.goto('/dashboard')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/auth\/login/)

    // Should show login form
    await expect(page.locator('form')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should successfully register a new user', async ({ page }) => {
    await page.goto('/auth/register')

    // Fill registration form
    await page.fill('[name="firstName"]', 'Test')
    await page.fill('[name="lastName"]', 'User')
    await page.fill('[name="email"]', `test.user.${Date.now()}@example.com`)
    await page.fill('[name="password"]', 'TestPassword123!')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to login with success message
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByText(/registration successful/i)).toBeVisible()
  })

  test('should successfully login with verified user', async ({ page }) => {
    await page.goto('/auth/login')

    // Fill login form with verified test user
    await page.fill('[name="email"]', 'sandro.suladze@gmail.com')
    await page.fill('[name="password"]', 'TestPassword123!')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')

    // Should show dashboard content
    await expect(page.getByText(/welcome/i)).toBeVisible()
    await expect(page.getByText(/projects/i)).toBeVisible()
  })

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.goto('/auth/login')

    // Try to login with invalid credentials
    await page.fill('[name="email"]', 'invalid@example.com')
    await page.fill('[name="password"]', 'wrongpassword')

    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'sandro.suladze@gmail.com')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard')

    // Click logout button
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Sign Out')

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})