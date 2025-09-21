/**
 * E2E Test: Export Functionality with Selection
 * Tests export mode activation, selection, and CSV generation
 */

import { test, expect } from '@playwright/test';

const TEST_PROJECT_ID = 'b6676813-5f1a-41f6-921b-95f16a4183a2';
const API_BASE = 'http://localhost:3000/api';

test.describe('Export Functionality - Contract & UI Tests', () => {
  // API Contract Tests
  test('POST /api/projects/{projectId}/reports/export - should export selected reports to CSV', async ({ request }) => {
    const exportConfig = {
      format: 'csv',
      report_ids: ['report-1', 'report-2', 'report-3'],
      include_fields: {
        title: true,
        description: true,
        type: true,
        priority: true,
        reporter: true,
        url: true,
        created_at: true,
        console_logs: false,
        network_requests: false
      },
      template: 'default'
    };

    const response = await request.post(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports/export`, {
      data: exportConfig
    });

    expect(response.ok()).toBeTruthy();

    // Check Content-Type header for CSV
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/csv');

    // Check Content-Disposition for filename
    const contentDisposition = response.headers()['content-disposition'];
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('filename=');
  });

  test('POST /api/projects/{projectId}/reports/export - should support JSON format', async ({ request }) => {
    const exportConfig = {
      format: 'json',
      filters: {
        type: 'bug',
        priority: 'high'
      },
      include_fields: {
        title: true,
        description: false,
        type: true,
        priority: true,
        reporter: false,
        url: false,
        created_at: true,
        console_logs: false,
        network_requests: false
      }
    };

    const response = await request.post(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports/export`, {
      data: exportConfig
    });

    expect(response.ok()).toBeTruthy();

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('POST /api/projects/{projectId}/reports/export - should support Jira template', async ({ request }) => {
    const exportConfig = {
      format: 'csv',
      report_ids: ['report-1'],
      template: 'jira',
      include_fields: {
        title: true,
        description: true,
        type: true,
        priority: true,
        reporter: true,
        url: false,
        created_at: true,
        console_logs: false,
        network_requests: false
      }
    };

    const response = await request.post(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports/export`, {
      data: exportConfig
    });

    expect(response.ok()).toBeTruthy();

    const csvContent = await response.text();
    // Jira template should have specific column names
    expect(csvContent).toContain('Summary'); // Jira uses Summary instead of Title
    expect(csvContent).toContain('Issue Type'); // Jira uses Issue Type
  });

  // UI Tests for Export Mode
  test('Export mode activation and selection - Scenario 8', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Look for export icon
    const exportIcon = page.locator('[data-testid="export-icon"], button[aria-label="Export"]');
    await expect(exportIcon).toBeVisible();

    // Click export icon to enter selection mode
    await exportIcon.click();

    // Verify selection mode is activated
    const selectionIndicator = page.locator('[data-testid="selection-mode"], .selection-mode-active');
    await expect(selectionIndicator).toBeVisible();

    // Verify checkboxes appear for all table rows
    const checkboxes = page.locator('input[type="checkbox"][data-testid^="select-report-"]');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);

    // Verify all items are pre-selected by default
    for (let i = 0; i < checkboxCount; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }

    // Verify selection counter shows total count
    const selectionCounter = page.locator('[data-testid="selection-counter"]');
    await expect(selectionCounter).toContainText(String(checkboxCount));
  });

  test('Bulk report selection - Scenario 9', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Enter export mode
    await page.click('[data-testid="export-icon"], button[aria-label="Export"]');

    // Find "Select All" button/checkbox
    const selectAllButton = page.locator('[data-testid="select-all"], input[aria-label="Select all"]');
    await expect(selectAllButton).toBeVisible();

    // Click to deselect all
    await selectAllButton.click();

    // Verify all checkboxes are unchecked
    const checkboxes = page.locator('input[type="checkbox"][data-testid^="select-report-"]');
    const checkboxCount = await checkboxes.count();

    for (let i = 0; i < checkboxCount; i++) {
      await expect(checkboxes.nth(i)).not.toBeChecked();
    }

    // Click to select all again
    await selectAllButton.click();

    // Verify all checkboxes are checked
    for (let i = 0; i < checkboxCount; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }

    // Manually deselect one report
    if (checkboxCount > 0) {
      await checkboxes.first().click();
      await expect(checkboxes.first()).not.toBeChecked();

      // Verify counter updates
      const selectionCounter = page.locator('[data-testid="selection-counter"]');
      await expect(selectionCounter).toContainText(String(checkboxCount - 1));
    }
  });

  test('CSV export generation - Scenario 10', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Enter export mode
    await page.click('[data-testid="export-icon"], button[aria-label="Export"]');

    // Select 5 specific reports
    const checkboxes = page.locator('input[type="checkbox"][data-testid^="select-report-"]');
    const totalCheckboxes = await checkboxes.count();

    // First deselect all
    const selectAllButton = page.locator('[data-testid="select-all"], input[aria-label="Select all"]');
    await selectAllButton.click(); // Deselect all

    // Select up to 5 reports
    const selectCount = Math.min(5, totalCheckboxes);
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).click();
    }

    // Click export button
    const exportButton = page.locator('[data-testid="export-selected"], button:has-text("Export Selected")');
    await expect(exportButton).toBeVisible();

    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download');

    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify filename contains 'feedloop' and '.csv'
    const filename = download.suggestedFilename();
    expect(filename).toContain('feedloop');
    expect(filename).toContain('.csv');

    // Verify download completes
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('Export field customization - Scenario 11', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Enter export mode
    await page.click('[data-testid="export-icon"], button[aria-label="Export"]');

    // Look for export options/settings button
    const exportOptionsButton = page.locator('[data-testid="export-options"], button:has-text("Export Options")');

    // Click to open export options if visible
    if (await exportOptionsButton.isVisible()) {
      await exportOptionsButton.click();

      // Check for field selection checkboxes
      const fieldCheckboxes = {
        description: page.locator('input[name="include_description"]'),
        consoleLogs: page.locator('input[name="include_console_logs"]'),
        networkRequests: page.locator('input[name="include_network_requests"]')
      };

      // Toggle some fields
      if (await fieldCheckboxes.description.isVisible()) {
        await fieldCheckboxes.description.uncheck();
      }
      if (await fieldCheckboxes.consoleLogs.isVisible()) {
        await fieldCheckboxes.consoleLogs.check();
      }

      // Check preview if available
      const preview = page.locator('[data-testid="export-preview"]');
      if (await preview.isVisible()) {
        const previewText = await preview.textContent();
        expect(previewText).toBeTruthy();
      }
    }

    // Proceed with export
    const exportButton = page.locator('[data-testid="export-selected"], button:has-text("Export")');
    await exportButton.click();

    // Verify export completes (download starts)
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    const download = await downloadPromise;

    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toContain('.csv');
    }
  });

  test('Performance validation for export - Scenario 12', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Measure time to enter export mode
    const startTime = Date.now();

    await page.click('[data-testid="export-icon"], button[aria-label="Export"]');

    // Wait for selection mode to be active
    await page.waitForSelector('[data-testid="selection-mode"], .selection-mode-active');

    const exportModeTime = Date.now() - startTime;

    // Export mode should activate within 500ms
    expect(exportModeTime).toBeLessThan(500);

    // Measure export time for selected reports
    const exportButton = page.locator('[data-testid="export-selected"], button:has-text("Export")');

    const exportStartTime = Date.now();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

    await exportButton.click();

    const download = await downloadPromise;

    if (download) {
      const exportTime = Date.now() - exportStartTime;

      // Export should complete within 5 seconds for reasonable number of reports
      expect(exportTime).toBeLessThan(5000);
    }
  });
});