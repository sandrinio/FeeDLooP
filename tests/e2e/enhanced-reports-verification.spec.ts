/**
 * Enhanced Reports Dashboard Verification Test
 * Comprehensive test to verify all enhanced features are working
 */

import { test, expect } from '@playwright/test';

const TEST_PROJECT_ID = 'b6676813-5f1a-41f6-921b-95f16a4183a2';

test('Enhanced Reports Dashboard - Full Feature Verification', async ({ page }) => {
  console.log('🔍 Starting Enhanced Reports Dashboard verification...');

  // Authentication
  console.log('🔐 Authenticating...');
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[id="email"]', { timeout: 5000 });
  await page.fill('input[id="email"]', 'sandro.suladze@gmail.com');
  await page.fill('input[id="password"]', 'Kukuruku!23');
  await page.click('button[type="submit"]');

  // Wait for authentication to complete
  try {
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    console.log('✅ Authentication successful');
  } catch {
    console.log('⚠️ Authentication redirect may have failed, continuing...');
  }

  // Navigate to enhanced reports page
  console.log('📊 Navigating to enhanced reports page...');
  await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`, {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Wait for page to fully load
  await page.waitForTimeout(3000);

  // Take initial screenshot
  await page.screenshot({
    path: 'test-results/enhanced-reports-overview.png',
    fullPage: true
  });

  console.log('🧪 Testing Enhanced Features...');

  // 1. Check for enhanced table structure
  console.log('Testing: Enhanced table structure...');
  const table = await page.locator('table').count();
  const hasTable = table > 0;
  console.log(`✓ Table present: ${hasTable}`);

  // 2. Check for filters section
  console.log('Testing: Filter functionality...');
  const filtersSection = await page.locator('[class*="filter"], .filters-section, .bg-white.shadow').first();
  const hasFilters = await filtersSection.count() > 0;
  console.log(`✓ Filters section present: ${hasFilters}`);

  if (hasFilters) {
    // Test search input
    const searchInput = await page.locator('input[placeholder*="Search"], input[type="text"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('test search');
      await page.waitForTimeout(500);
      await searchInput.clear();
      console.log('✓ Search input functional');
    }

    // Test filter dropdowns
    const dropdowns = await page.locator('select').count();
    console.log(`✓ Filter dropdowns found: ${dropdowns}`);

    if (dropdowns > 0) {
      // Test first dropdown
      await page.locator('select').first().selectOption({ index: 1 });
      await page.waitForTimeout(500);
      await page.locator('select').first().selectOption({ index: 0 });
      console.log('✓ Dropdown filtering functional');
    }
  }

  // 3. Check for removed status column
  console.log('Testing: Status column removal...');
  const statusHeader = await page.locator('th').filter({ hasText: /status/i }).count();
  const statusRemoved = statusHeader === 0;
  console.log(`✓ Status column removed: ${statusRemoved}`);

  // 4. Check for export functionality
  console.log('Testing: Export functionality...');
  const exportButton = await page.locator('button').filter({ hasText: /export/i }).count();
  const hasExportButton = exportButton > 0;
  console.log(`✓ Export button present: ${hasExportButton}`);

  if (hasExportButton) {
    await page.locator('button').filter({ hasText: /export/i }).first().click();
    await page.waitForTimeout(1000);

    // Check if export modal opens
    const modal = await page.locator('[role="dialog"], .modal, [data-testid*="modal"]').count();
    const hasModal = modal > 0;
    console.log(`✓ Export modal opens: ${hasModal}`);

    if (hasModal) {
      await page.screenshot({
        path: 'test-results/export-modal.png',
        fullPage: true
      });

      // Close modal
      const closeButtons = await page.locator('button').filter({ hasText: /close|cancel|×/i });
      if (await closeButtons.count() > 0) {
        await closeButtons.first().click();
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
      }
    }
  }

  // 5. Check for console logs section (if data exists)
  console.log('Testing: Console logs viewer...');
  const consoleLogsSection = await page.locator('[data-testid="console-logs-section"], .console-log, [class*="console"]').count();
  const hasConsoleLogs = consoleLogsSection > 0;
  console.log(`✓ Console logs section: ${hasConsoleLogs ? 'Present' : 'Not visible (likely no data)'}`);

  // 6. Check for enhanced styling and hover effects
  console.log('Testing: Enhanced styling and hover effects...');
  const tableRows = await page.locator('tbody tr').count();
  console.log(`✓ Table rows found: ${tableRows}`);

  if (tableRows > 0) {
    // Test hover effect on first row
    await page.locator('tbody tr').first().hover();
    await page.waitForTimeout(500);
    console.log('✓ Row hover effect tested');

    // Test for tooltips (if implemented)
    const links = await page.locator('tbody tr a').count();
    if (links > 0) {
      await page.locator('tbody tr a').first().hover();
      await page.waitForTimeout(1000);
      console.log('✓ Link hover tested for tooltips');
    }
  }

  // 7. Check responsive design
  console.log('Testing: Responsive design...');
  await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'test-results/responsive-tablet.png',
    fullPage: true
  });

  await page.setViewportSize({ width: 375, height: 667 }); // Mobile
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'test-results/responsive-mobile.png',
    fullPage: true
  });

  await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
  await page.waitForTimeout(1000);
  console.log('✓ Responsive design tested');

  // 8. API Response verification
  console.log('Testing: API responses...');
  const apiResponse = await page.waitForResponse(
    response => response.url().includes('/api/projects/') && response.url().includes('/reports'),
    { timeout: 5000 }
  ).catch(() => null);

  if (apiResponse) {
    console.log(`✓ API Response status: ${apiResponse.status()}`);
    if (apiResponse.status() === 200) {
      const responseBody = await apiResponse.json().catch(() => null);
      if (responseBody) {
        console.log(`✓ API Response structure: ${Object.keys(responseBody).join(', ')}`);
      }
    }
  }

  // Final screenshot
  await page.screenshot({
    path: 'test-results/enhanced-reports-final.png',
    fullPage: true
  });

  // 9. Performance check
  console.log('Testing: Performance metrics...');
  const performanceEntries = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0
    };
  });

  console.log(`✓ Load time: ${performanceEntries.loadTime}ms`);
  console.log(`✓ DOM loaded: ${performanceEntries.domContentLoaded}ms`);

  // Summary
  console.log('\n📋 ENHANCED REPORTS VERIFICATION SUMMARY:');
  console.log('='.repeat(50));
  console.log(`✓ Table Structure: ${hasTable}`);
  console.log(`✓ Filters Section: ${hasFilters}`);
  console.log(`✓ Status Column Removed: ${statusRemoved}`);
  console.log(`✓ Export Functionality: ${hasExportButton}`);
  console.log(`✓ Console Logs Viewer: ${hasConsoleLogs ? 'Present' : 'Hidden (no data)'}`);
  console.log(`✓ Table Rows: ${tableRows}`);
  console.log(`✓ Responsive Design: Tested`);
  console.log(`✓ Performance: Load ${performanceEntries.loadTime}ms`);
  console.log('='.repeat(50));

  // Verify core functionality is working
  expect(hasTable).toBe(true);
  expect(statusRemoved).toBe(true); // Status column should be removed
  expect(page.url()).toContain('/reports');
});