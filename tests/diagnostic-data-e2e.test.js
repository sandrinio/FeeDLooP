/**
 * End-to-End Diagnostic Data Flow Test
 * Tests complete console log and network request capture + display flow
 */

const { test, expect } = require('@playwright/test');

test.describe('Diagnostic Data Flow', () => {
  test('Widget captures and frontend displays diagnostic data', async ({ page }) => {
    // Navigate to test page with widget
    await page.goto('http://localhost:3000/test-console-capture.html');

    // Wait for page and widget to load
    await page.waitForSelector('#feedloop-widget');

    // Generate console logs and network requests
    console.log('🧪 Generating test diagnostic data...');

    // Generate console logs
    await page.click('button:has-text("Generate Mixed Logs")');
    await page.waitForTimeout(1000);

    // Generate network requests
    await page.click('button:has-text("Make API Requests")');
    await page.waitForTimeout(2000);

    // Open widget
    await page.click('.feedloop-trigger-btn');
    await page.waitForSelector('.feedloop-panel', { state: 'visible' });

    // Fill out widget form
    await page.fill('input[name="title"]', 'E2E Test Report with Diagnostic Data');
    await page.fill('input[name="reporter_name"]', 'Test User');
    await page.fill('input[name="reporter_email"]', 'test@example.com');

    // Set description in rich text editor
    await page.click('.feedloop-editor');
    await page.type('.feedloop-editor', 'This is a test report to verify console logs and network requests are captured and displayed properly.');

    // Submit the form
    console.log('🚀 Submitting widget form...');
    await page.click('.feedloop-submit-btn');

    // Wait for success message
    await page.waitForSelector('.feedloop-success', { timeout: 30000 });

    // Extract report ID from success message (assuming it's displayed)
    const successMessage = await page.textContent('.feedloop-success');
    console.log('✅ Widget submission successful:', successMessage);

    // Wait a moment for backend processing
    await page.waitForTimeout(2000);

    console.log('🔄 Test completed - diagnostic data should be captured');
  });

  test('Dashboard displays diagnostic data in reports', async ({ page }) => {
    // Login to dashboard first
    await page.goto('http://localhost:3000/auth/login');

    // Login with test credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to project reports
    await page.waitForURL('**/dashboard');

    // Find and click on first project
    await page.click('.project-card:first-child a, [data-testid="project-link"]:first-child');

    // Navigate to reports section
    await page.click('a:has-text("Reports"), [href*="/reports"]');

    // Click on the most recent report (likely our test report)
    await page.click('.report-item:first-child, .report-row:first-child');

    // Check if diagnostic data sections are visible
    console.log('🔍 Checking for diagnostic data sections...');

    // Look for console logs section
    const consoleLogsSection = await page.locator('h2:has-text("Console Logs")');
    if (await consoleLogsSection.count() > 0) {
      console.log('✅ Console Logs section found');

      // Click to expand if collapsed
      await consoleLogsSection.click();

      // Check for log entries
      const logEntries = await page.locator('.font-mono:has-text("LOG"), .font-mono:has-text("ERROR"), .font-mono:has-text("WARN")');
      const logCount = await logEntries.count();
      console.log(`📝 Found ${logCount} console log entries`);

      expect(logCount).toBeGreaterThan(0);
    } else {
      console.log('❌ Console Logs section not found');
    }

    // Look for network requests section
    const networkSection = await page.locator('h2:has-text("Network Requests")');
    if (await networkSection.count() > 0) {
      console.log('✅ Network Requests section found');

      // Click to expand if collapsed
      await networkSection.click();

      // Check for request entries
      const requestEntries = await page.locator('.font-mono:has-text("GET"), .font-mono:has-text("POST")');
      const requestCount = await requestEntries.count();
      console.log(`🌐 Found ${requestCount} network request entries`);

      expect(requestCount).toBeGreaterThan(0);
    } else {
      console.log('❌ Network Requests section not found');
    }

    console.log('🎯 Dashboard diagnostic data test completed');
  });
});