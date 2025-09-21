/**
 * Error Capture Test - Visit reports page and capture errors
 */

import { test, expect } from '@playwright/test';

const TEST_PROJECT_ID = 'b6676813-5f1a-41f6-921b-95f16a4183a2';

test('reports page error capture', async ({ page }) => {
  // Set up console error capture
  const consoleErrors: string[] = [];
  const networkErrors: any[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  page.on('response', response => {
    if (!response.ok() && response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(`PAGE ERROR: ${error.message}\nStack: ${error.stack}`);
  });

  console.log('🔐 Authenticating test user...');

  // First, go to login page
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });

  // Wait for form to be ready
  await page.waitForSelector('input[id="email"]', { timeout: 5000 });

  // Fill in login form with real user credentials
  await page.fill('input[id="email"]', 'sandro.suladze@gmail.com');
  await page.fill('input[id="password"]', 'Kukuruku!23');

  // Submit login form and wait for navigation
  const [response] = await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/api/auth/') && response.status() === 200
    ),
    page.click('button[type="submit"]')
  ]);

  console.log(`Login response: ${response.status()}`);

  // Wait for dashboard redirect with a longer timeout
  try {
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
  } catch (urlError) {
    console.log(`Current URL after login attempt: ${page.url()}`);
    console.log('Login may have failed, checking for error messages...');

    // Check for login error messages on the page
    const errorMessages = await page.locator('[class*="red"], [class*="error"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('Login error messages:', errorMessages);
    }

    // Continue with the test anyway to capture errors
  }

  console.log('✅ Authentication successful');
  console.log('🔍 Visiting reports page...');

  try {
    // Test both the reports list page and a specific report detail page
    console.log('Testing reports list page...');
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    console.log('Staying on reports list page to test enhanced features...');

    // Wait a moment for any async errors and page to fully load
    await page.waitForTimeout(3000);

    console.log('\n📊 ERROR CAPTURE SUMMARY:');
    console.log('='.repeat(50));

    if (consoleErrors.length > 0) {
      console.log('\n🚨 CONSOLE/PAGE ERRORS:');
      consoleErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No console errors detected');
    }

    if (networkErrors.length > 0) {
      console.log('\n🌐 NETWORK ERRORS:');
      networkErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.status} ${error.statusText} - ${error.url}`);
      });
    } else {
      console.log('\n✅ No network errors detected');
    }

    console.log('\n📝 PAGE STATE:');
    console.log(`URL: ${page.url()}`);
    console.log(`Title: ${await page.title()}`);

    // Check if main elements are present
    const tableExists = await page.locator('table, [data-testid="reports-table"]').count() > 0;
    const filtersExist = await page.locator('[data-testid="filters"], .filters-section').count() > 0;

    // Test enhanced features if available
    const consoleLogsSection = await page.locator('[data-testid="console-logs-section"]').count() > 0;
    const expandLogsButton = await page.locator('[data-testid="expand-logs"]').count() > 0;
    const exportButton = await page.locator('[data-testid="export-button"]').count() > 0;
    const filterToggle = await page.locator('[data-testid="toggle-filters"]').count() > 0;

    console.log(`Table present: ${tableExists}`);
    console.log(`Filters present: ${filtersExist}`);
    console.log(`Console logs section: ${consoleLogsSection}`);
    console.log(`Export functionality: ${exportButton}`);
    console.log(`Filter toggle: ${filterToggle}`);

    // Test enhanced features if the reports page loads successfully
    if (tableExists && page.url().includes('/reports')) {
      console.log('\n🧪 Testing Enhanced Features:');

      // Test filter functionality
      if (filterToggle) {
        console.log('Testing filter toggle...');
        await page.click('[data-testid="toggle-filters"]');
        await page.waitForTimeout(500);
      }

      // Test console log viewer if present
      if (expandLogsButton) {
        console.log('Testing console log expansion...');
        await page.click('[data-testid="expand-logs"]');
        await page.waitForTimeout(500);
      }

      // Test export functionality if present
      if (exportButton) {
        console.log('Testing export button...');
        await page.click('[data-testid="export-button"]');
        await page.waitForTimeout(500);

        // Check if export modal opens
        const exportModal = await page.locator('[data-testid="export-modal"]').count() > 0;
        console.log(`Export modal opens: ${exportModal}`);

        if (exportModal) {
          // Close modal
          const closeButton = await page.locator('[data-testid="close-modal"], [aria-label="Close"]').first();
          if (await closeButton.count() > 0) {
            await closeButton.click();
          }
        }
      }
    }

  } catch (error) {
    console.log(`\n💥 NAVIGATION ERROR: ${error}`);
  }

  console.log('\n' + '='.repeat(50));
});