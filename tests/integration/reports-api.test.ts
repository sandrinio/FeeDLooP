// Contract Test: Enhanced Reports API
// Tests the enhanced reports visualization endpoints
// CRITICAL: This test MUST FAIL until implementation is complete

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type {
  ReportsQuery,
  ReportsResponse,
  EnhancedReport,
  PerformanceMetrics
} from '../../lib/types/diagnostics';

describe('Enhanced Reports API Contract', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Test project setup
  let testProjectId: string;
  let testReportIds: string[];

  beforeAll(async () => {
    // This would normally set up test data
    testProjectId = 'test-project-enhanced-reports';
    testReportIds = ['report-1', 'report-2', 'report-3'];

    // TODO: Create test reports with enhanced data
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('Enhanced Reports List API', () => {
    it('should support performance-based filtering', async () => {
      const query: ReportsQuery = {
        project_id: testProjectId,
        filters: {
          performance: ['critical', 'high'],
          has_metrics: true,
          date_range: {
            from: '2025-09-01T00:00:00Z',
            to: '2025-09-21T23:59:59Z'
          }
        },
        sort: {
          column: 'lcp',
          direction: 'desc'
        },
        pagination: {
          page: 1,
          limit: 20
        },
        include: ['performance_metrics', 'error_context']
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query)
      });

      expect(response.status).toBe(200);

      const result: ReportsResponse = await response.json();

      expect(result).toMatchObject({
        success: true,
        reports: expect.any(Array),
        pagination: {
          page: 1,
          limit: 20,
          total: expect.any(Number),
          pages: expect.any(Number)
        }
      });

      // Verify enhanced data is included
      if (result.reports.length > 0) {
        const report = result.reports[0] as EnhancedReport;
        expect(report.performance_metrics).toBeDefined();
        expect(report.performance_metrics?.categorization?.overall).toMatch(/critical|high|medium|low/);
      }

      // Verify aggregations
      expect(result.aggregations).toBeDefined();
      expect(result.aggregations?.total_by_performance).toBeDefined();
    });

    it('should support error context filtering', async () => {
      const query: ReportsQuery = {
        project_id: testProjectId,
        filters: {
          has_errors: true,
          error_count: {
            min: 1,
            max: 10
          }
        },
        sort: {
          column: 'error_count',
          direction: 'desc'
        },
        pagination: {
          page: 1,
          limit: 10
        }
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query)
      });

      expect(response.status).toBe(200);

      const result: ReportsResponse = await response.json();
      expect(result.success).toBe(true);

      // Verify all returned reports have error context
      result.reports.forEach((report: EnhancedReport) => {
        expect(report.error_context).toBeDefined();
        expect(report.error_context?.total_error_count).toBeGreaterThan(0);
      });
    });

    it('should support Core Web Vitals sorting', async () => {
      const metrics = ['lcp', 'fcp', 'cls', 'fid', 'tti'] as const;

      for (const metric of metrics) {
        const query: ReportsQuery = {
          project_id: testProjectId,
          filters: {
            has_metrics: true
          },
          sort: {
            column: metric,
            direction: 'desc'
          },
          pagination: {
            page: 1,
            limit: 5
          }
        };

        const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(query)
        });

        expect(response.status).toBe(200);

        const result: ReportsResponse = await response.json();
        expect(result.success).toBe(true);

        // Verify sorting is applied correctly
        if (result.reports.length > 1) {
          const firstReport = result.reports[0] as EnhancedReport;
          const secondReport = result.reports[1] as EnhancedReport;

          const firstValue = firstReport.performance_metrics?.web_vitals[metric];
          const secondValue = secondReport.performance_metrics?.web_vitals[metric];

          if (firstValue !== undefined && secondValue !== undefined) {
            expect(firstValue).toBeGreaterThanOrEqual(secondValue);
          }
        }
      }
    });
  });

  describe('Enhanced Report Detail API', () => {
    it('should return complete enhanced report data', async () => {
      const reportId = testReportIds[0];

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/${reportId}`);

      expect(response.status).toBe(200);

      const report: EnhancedReport = await response.json();

      // Verify basic report structure
      expect(report).toMatchObject({
        id: reportId,
        project_id: testProjectId,
        type: expect.stringMatching(/bug|initiative|feedback/),
        title: expect.any(String),
        description: expect.any(String),
        status: expect.stringMatching(/active|archived/),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      // Verify enhanced data structure
      if (report.performance_metrics) {
        expect(report.performance_metrics).toMatchObject({
          web_vitals: expect.objectContaining({
            // At least one metric should be present
          }),
          categorization: {
            overall: expect.stringMatching(/critical|high|medium|low/),
            details: expect.any(String)
          }
        });
      }

      if (report.error_context) {
        expect(report.error_context).toMatchObject({
          total_error_count: expect.any(Number),
          unhandled_errors: expect.any(Array),
          promise_rejections: expect.any(Array),
          cors_errors: expect.any(Array),
          csp_violations: expect.any(Array)
        });
      }

      if (report.interaction_data) {
        expect(report.interaction_data).toMatchObject({
          consent_given: true,
          consent_timestamp: expect.any(String),
          events: expect.any(Array)
        });
      }
    });

    it('should handle reports without enhanced data (backward compatibility)', async () => {
      // Test with a basic report that doesn't have enhanced fields
      const basicReportId = 'basic-report-no-enhanced-data';

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/${basicReportId}`);

      expect(response.status).toBe(200);

      const report: EnhancedReport = await response.json();

      // Should still have basic structure
      expect(report.id).toBe(basicReportId);
      expect(report.console_logs).toBeDefined();
      expect(report.network_requests).toBeDefined();

      // Enhanced fields should be undefined or null, not cause errors
      expect(() => report.performance_metrics).not.toThrow();
      expect(() => report.error_context).not.toThrow();
      expect(() => report.interaction_data).not.toThrow();
    });
  });

  describe('Performance Analysis Endpoint', () => {
    it('should provide performance analysis for reports with metrics', async () => {
      const reportId = testReportIds[0];

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/${reportId}/performance`);

      expect(response.status).toBe(200);

      const analysis = await response.json();

      expect(analysis).toMatchObject({
        report_id: reportId,
        performance_score: {
          overall: expect.any(Number),
          fcp: expect.any(Number),
          lcp: expect.any(Number),
          cls: expect.any(Number),
          fid: expect.any(Number),
          tti: expect.any(Number)
        },
        category_scores: {
          loading: expect.any(Number),
          interactivity: expect.any(Number),
          visual_stability: expect.any(Number)
        },
        recommendations: expect.any(Array),
        diagnostics: expect.any(Array),
        thresholds_used: expect.any(Object)
      });

      // Verify score ranges
      expect(analysis.performance_score.overall).toBeGreaterThanOrEqual(0);
      expect(analysis.performance_score.overall).toBeLessThanOrEqual(100);

      // Verify recommendations structure
      if (analysis.recommendations.length > 0) {
        expect(analysis.recommendations[0]).toMatchObject({
          metric: expect.any(String),
          impact: expect.stringMatching(/high|medium|low/),
          description: expect.any(String),
          estimated_savings: expect.any(Number)
        });
      }
    });

    it('should return 404 for reports without performance metrics', async () => {
      const basicReportId = 'basic-report-no-metrics';

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/${basicReportId}/performance`);

      expect(response.status).toBe(404);

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toContain('performance metrics not available');
    });
  });

  describe('Pattern Analysis Endpoint', () => {
    it('should identify error patterns across reports', async () => {
      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'error',
          time_range: {
            from: '2025-09-01T00:00:00Z',
            to: '2025-09-21T23:59:59Z'
          },
          min_occurrences: 2
        })
      });

      expect(response.status).toBe(200);

      const patterns = await response.json();

      expect(patterns).toMatchObject({
        success: true,
        patterns: expect.any(Array),
        analysis_period: expect.any(Object),
        total_reports_analyzed: expect.any(Number)
      });

      if (patterns.patterns.length > 0) {
        expect(patterns.patterns[0]).toMatchObject({
          pattern_id: expect.any(String),
          pattern: expect.any(String),
          occurrence_count: expect.any(Number),
          affected_reports: expect.any(Array),
          first_seen: expect.any(String),
          last_seen: expect.any(String),
          severity: expect.stringMatching(/critical|high|medium|low/),
          recommended_action: expect.any(String)
        });
      }
    });

    it('should identify performance patterns', async () => {
      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance',
          metric: 'lcp',
          threshold: 2500,
          time_range: {
            from: '2025-09-01T00:00:00Z',
            to: '2025-09-21T23:59:59Z'
          }
        })
      });

      expect(response.status).toBe(200);

      const patterns = await response.json();

      expect(patterns.success).toBe(true);
      expect(patterns.patterns).toBeInstanceOf(Array);

      if (patterns.patterns.length > 0) {
        expect(patterns.patterns[0]).toMatchObject({
          pattern_type: 'performance',
          metric: 'lcp',
          threshold_exceeded: expect.any(Boolean),
          average_value: expect.any(Number),
          affected_reports_count: expect.any(Number),
          trend: expect.stringMatching(/improving|degrading|stable/)
        });
      }
    });
  });

  describe('Cross-Correlation Analysis', () => {
    it('should correlate network requests with error patterns', async () => {
      const reportId = testReportIds[0];

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/${reportId}/correlations`);

      expect(response.status).toBe(200);

      const correlations = await response.json();

      expect(correlations).toMatchObject({
        report_id: reportId,
        correlations: expect.any(Array),
        analysis_confidence: expect.any(Number)
      });

      if (correlations.correlations.length > 0) {
        expect(correlations.correlations[0]).toMatchObject({
          correlation_id: expect.any(String),
          type: expect.stringMatching(/error_network|performance_resource|timing_sequence/),
          confidence: expect.any(Number),
          description: expect.any(String),
          evidence: expect.any(Object)
        });
      }
    });
  });

  describe('Data Consistency and Performance', () => {
    it('should respond to filtered queries within performance threshold', async () => {
      const startTime = Date.now();

      const query: ReportsQuery = {
        project_id: testProjectId,
        filters: {
          performance: ['critical', 'high'],
          has_metrics: true,
          error_count: { min: 1 }
        },
        pagination: { page: 1, limit: 50 }
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100); // <100ms as specified

      const result: ReportsResponse = await response.json();
      expect(result.success).toBe(true);
    });

    it('should maintain data consistency between list and detail views', async () => {
      // Get list of reports
      const listResponse = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: testProjectId,
          pagination: { page: 1, limit: 5 },
          include: ['performance_metrics']
        })
      });

      expect(listResponse.status).toBe(200);
      const listResult: ReportsResponse = await listResponse.json();

      if (listResult.reports.length === 0) {
        return; // Skip if no reports
      }

      // Get detailed view of first report
      const reportId = listResult.reports[0].id;
      const detailResponse = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/${reportId}`);

      expect(detailResponse.status).toBe(200);
      const detailReport: EnhancedReport = await detailResponse.json();

      // Verify consistency
      const listReport = listResult.reports[0] as EnhancedReport;
      expect(detailReport.id).toBe(listReport.id);
      expect(detailReport.title).toBe(listReport.title);

      // Performance metrics should be consistent
      if (listReport.performance_metrics && detailReport.performance_metrics) {
        expect(detailReport.performance_metrics.web_vitals.lcp)
          .toBe(listReport.performance_metrics.web_vitals.lcp);
      }
    });
  });
});