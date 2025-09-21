/**
 * E2E Contract Test: Enhanced Reports API with Filtering
 * Tests the enhanced GET /api/projects/{projectId}/reports endpoint
 */

import { test, expect } from '@playwright/test';

const TEST_PROJECT_ID = 'b6676813-5f1a-41f6-921b-95f16a4183a2';
const API_BASE = 'http://localhost:3000/api';

test.describe('Enhanced Reports API - Contract Tests', () => {
  test('GET /api/projects/{projectId}/reports - should support enhanced filtering', async ({ request }) => {
    // Test filtering by title
    const titleResponse = await request.get(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports`, {
      params: {
        'filter[title]': 'bug',
        'page': 1,
        'limit': 20
      }
    });

    expect(titleResponse.ok()).toBeTruthy();
    const titleData = await titleResponse.json();

    // Verify response structure
    expect(titleData).toHaveProperty('reports');
    expect(titleData).toHaveProperty('pagination');
    expect(titleData).toHaveProperty('metadata');

    // Verify pagination structure
    expect(titleData.pagination).toMatchObject({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
      total_pages: expect.any(Number),
      has_next: expect.any(Boolean),
      has_prev: expect.any(Boolean)
    });

    // Verify metadata structure
    expect(titleData.metadata).toHaveProperty('total_by_type');
    expect(titleData.metadata).toHaveProperty('total_by_priority');
  });

  test('GET /api/projects/{projectId}/reports - should support type filtering', async ({ request }) => {
    const response = await request.get(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports`, {
      params: {
        'filter[type]': 'bug'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // All returned reports should be of type 'bug'
    if (data.reports && data.reports.length > 0) {
      data.reports.forEach((report: any) => {
        expect(report.type).toBe('bug');
      });
    }
  });

  test('GET /api/projects/{projectId}/reports - should support priority filtering', async ({ request }) => {
    const response = await request.get(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports`, {
      params: {
        'filter[priority]': 'high'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // All returned reports should have 'high' priority
    if (data.reports && data.reports.length > 0) {
      data.reports.forEach((report: any) => {
        expect(report.priority).toBe('high');
      });
    }
  });

  test('GET /api/projects/{projectId}/reports - should support date range filtering', async ({ request }) => {
    const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
    const dateTo = new Date().toISOString();

    const response = await request.get(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports`, {
      params: {
        'filter[dateFrom]': dateFrom,
        'filter[dateTo]': dateTo
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // All returned reports should be within the date range
    if (data.reports && data.reports.length > 0) {
      data.reports.forEach((report: any) => {
        const createdAt = new Date(report.created_at);
        expect(createdAt >= new Date(dateFrom)).toBeTruthy();
        expect(createdAt <= new Date(dateTo)).toBeTruthy();
      });
    }
  });

  test('GET /api/projects/{projectId}/reports - should support sorting', async ({ request }) => {
    // Test sorting by created_at in descending order
    const response = await request.get(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports`, {
      params: {
        'sort[column]': 'created_at',
        'sort[direction]': 'desc'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify reports are sorted correctly
    if (data.reports && data.reports.length > 1) {
      for (let i = 1; i < data.reports.length; i++) {
        const prevDate = new Date(data.reports[i - 1].created_at);
        const currDate = new Date(data.reports[i].created_at);
        expect(prevDate >= currDate).toBeTruthy();
      }
    }
  });

  test('GET /api/projects/{projectId}/reports - should include count metadata', async ({ request }) => {
    const response = await request.get(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports`, {
      params: {
        'include': 'console_logs_count,network_requests_count,attachments_count'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify count fields are included when requested
    if (data.reports && data.reports.length > 0) {
      data.reports.forEach((report: any) => {
        expect(report).toHaveProperty('console_logs_count');
        expect(report).toHaveProperty('network_requests_count');
        expect(report).toHaveProperty('attachments_count');
      });
    }
  });

  test('GET /api/projects/{projectId}/reports - should NOT include status column', async ({ request }) => {
    const response = await request.get(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Status column should not be included in the response
    if (data.reports && data.reports.length > 0) {
      data.reports.forEach((report: any) => {
        expect(report).not.toHaveProperty('status');
      });
    }
  });

  test('GET /api/projects/{projectId}/reports - should support pagination', async ({ request }) => {
    const response = await request.get(`${API_BASE}/projects/${TEST_PROJECT_ID}/reports`, {
      params: {
        'page': 2,
        'limit': 5
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(5);
    expect(data.reports.length).toBeLessThanOrEqual(5);
  });
});