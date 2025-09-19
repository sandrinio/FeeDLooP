/**
 * Simple Authentication Form Validation Test
 * Focused test for registration and login validation
 */

import { test, expect } from '@playwright/test'

test.describe('Auth Form Validation - Simple Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies()
    await page.goto('http://localhost:3000')
  })

  test('Registration form validation works correctly', async ({ page }) => {
    // Navigate to registration
    await page.goto('http://localhost:3000/auth/register')

    // Check initial state - submit button should be enabled (only disabled during loading)
    await expect(page.locator('button[type="submit"]')).toBeEnabled()

    // Test email validation
    await page.locator('#email').fill('invalid-email')
    await page.locator('#first_name').focus()
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible()

    // Test password strength indicator
    await page.locator('#password').fill('weak')
    await expect(page.locator('text=Password strength:')).toBeVisible()

    // Test strong password
    await page.locator('#password').fill('StrongPass123!')
    await expect(page.locator('text=Password strength: Strong')).toBeVisible()

    // Fill valid form data
    await page.locator('#first_name').fill('John')
    await page.locator('#last_name').fill('Doe')
    await page.locator('#email').fill('john.test2@example.com')
    await page.locator('#company').fill('Test Company')
    await page.locator('#password').fill('ValidPass123!')
    await page.locator('#confirmPassword').fill('ValidPass123!')

    // Submit button should still be enabled (it's always enabled unless loading)
    await expect(page.locator('button[type="submit"]')).toBeEnabled()

    // Test form submission
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('text=Creating account...')).toBeVisible()
  })

  test('Login form validation works correctly', async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:3000/auth/login')

    // Check initial state - submit button should be enabled (only disabled during loading)
    await expect(page.locator('button[type="submit"]')).toBeEnabled()

    // Test email validation
    await page.locator('#email').fill('invalid')
    await page.locator('#password').focus()
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible()

    // Fill valid data
    await page.locator('#email').fill('test@example.com')
    await page.locator('#password').fill('somepassword')

    // Submit button should still be enabled (it's always enabled unless loading)
    await expect(page.locator('button[type="submit"]')).toBeEnabled()
  })

  test('Form navigation works correctly', async ({ page }) => {
    // Start at login
    await page.goto('http://localhost:3000/auth/login')

    // Navigate to register
    await page.locator('text=Don\'t have an account? Sign up').click()
    await expect(page).toHaveURL('/auth/register')

    // Navigate back to login
    await page.locator('text=Already have an account? Sign in').click()
    await expect(page).toHaveURL('/auth/login')
  })
})