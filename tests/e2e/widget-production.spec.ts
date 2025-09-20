import { test, expect } from '@playwright/test';

test.describe('Production Widget Tests', () => {
  test('production widget loads and submits feedback successfully', async ({ page }) => {
    // Navigate to demo page
    await page.goto('http://localhost:3000/demo-production.html');

    // Wait for widget to load
    await page.waitForTimeout(3000);

    // Check widget status
    const widgetStatus = page.locator('#widget-status');
    await expect(widgetStatus).toContainText('Widget loaded successfully');

    // Look for the feedback button
    const feedbackButton = page.locator('.feedloop-trigger-btn');
    await expect(feedbackButton).toBeVisible();

    // Click feedback button to open widget
    await feedbackButton.click();

    // Wait for widget panel to open
    const widgetPanel = page.locator('.feedloop-panel');
    await expect(widgetPanel).toBeVisible();

    // Fill out the form
    await page.fill('#feedloop-title', 'Production Test Report');
    await page.fill('.feedloop-editor', 'This is a test submission from the production widget test suite.');
    await page.fill('#feedloop-name', 'Production Tester');
    await page.fill('#feedloop-email', 'production@test.com');

    // Submit the form
    await page.click('.feedloop-submit-btn');

    // Wait for success message
    const successMessage = page.locator('.feedloop-success');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    await expect(successMessage).toContainText('Thank you');

    console.log('✅ Production widget test completed successfully');
  });

  test('widget API detection works correctly', async ({ page }) => {
    // Navigate to demo page
    await page.goto('http://localhost:3000/demo-production.html');

    // Wait for widget to load
    await page.waitForTimeout(3000);

    // Test widget API functionality
    await page.click('button:has-text("Test Widget API")');

    // Check console output for API test results
    const consoleOutput = page.locator('#console-output');
    await expect(consoleOutput).toContainText('Widget version: 1.0.0');
    await expect(consoleOutput).toContainText('API test response: 200');
  });

  test('widget handles large diagnostic data with compression', async ({ page }) => {
    // Navigate to demo page
    await page.goto('http://localhost:3000/demo-production.html');

    // Wait for widget to load
    await page.waitForTimeout(3000);

    // Generate test data to trigger compression
    await page.click('button:has-text("Generate Test Data")');

    // Open widget
    await page.click('.feedloop-trigger-btn');

    // Fill form with minimal data
    await page.fill('#feedloop-title', 'Compression Test');
    await page.fill('.feedloop-editor', 'Testing compression system');

    // Submit form
    await page.click('.feedloop-submit-btn');

    // Check for successful submission
    const successMessage = page.locator('.feedloop-success');
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    console.log('✅ Compression test completed successfully');
  });
});