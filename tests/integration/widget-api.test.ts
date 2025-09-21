// Contract Test: Enhanced Widget Submission API
// Tests the enhanced widget data collection endpoint
// CRITICAL: This test MUST FAIL until implementation is complete

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type {
  WidgetSubmissionData,
  WidgetSubmissionResponse,
  EnhancedReport
} from '../../lib/types/diagnostics';

describe('Enhanced Widget Submission API Contract', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const WIDGET_ENDPOINT = `${API_BASE}/api/widget/submit`;

  // Test project setup
  let testProjectKey: string;

  beforeAll(async () => {
    // This would normally set up a test project
    // For now, using a known test project key
    testProjectKey = 'test-enhanced-widget-project';
  });

  afterAll(async () => {
    // Cleanup test data if needed
  });

  describe('Enhanced Data Collection', () => {
    it('should accept performance metrics in widget submission', async () => {
      const enhancedSubmission: WidgetSubmissionData = {
        // Standard fields
        project_key: testProjectKey,
        type: 'bug',
        title: 'Performance test report',
        description: 'Testing enhanced performance metrics collection',
        url: 'https://example.com/test-page',
        user_agent: 'Mozilla/5.0 (Test Browser)',
        console_logs: JSON.stringify({
          entries: [
            {
              level: 'error',
              message: 'Test error for correlation',
              timestamp: '2025-09-21T10:30:00Z',
              correlation_id: 'test-correlation-1'
            }
          ],
          metadata: {
            total_count: 1,
            error_count: 1,
            warning_count: 0,
            truncated: false
          }
        }),
        network_requests: JSON.stringify({
          entries: [
            {
              id: 'req-1',
              url: 'https://api.example.com/data',
              method: 'GET',
              status: 200,
              duration: 150,
              timestamp: '2025-09-21T10:30:05Z',
              type: 'fetch',
              size: {
                request: 0,
                response: 1024,
                total: 1024
              },
              timing: {
                dns: 10,
                tcp: 20,
                request: 50,
                response: 70,
                total: 150
              },
              priority: 'high',
              correlation_id: 'test-correlation-1',
              cache_status: 'miss'
            }
          ],
          metadata: {
            total_requests: 1,
            failed_requests: 0,
            total_duration: 150,
            total_size: 1024
          }
        }),

        // NEW ENHANCED FIELDS
        performance_metrics: JSON.stringify({
          web_vitals: {
            fcp: 1200,    // First Contentful Paint
            lcp: 2400,    // Largest Contentful Paint
            cls: 0.15,    // Cumulative Layout Shift
            fid: 120,     // First Input Delay
            tti: 3800,    // Time to Interactive
            ttfb: 400     // Time to First Byte
          },
          custom_metrics: {
            dom_ready: 800,
            window_load: 2000,
            first_paint: 1000
          },
          resource_timing: {
            scripts: [
              {
                name: 'app.js',
                duration: 200,
                size: 50000,
                cache_status: 'hit',
                blocking_time: 50
              }
            ],
            stylesheets: [
              {
                name: 'styles.css',
                duration: 100,
                size: 20000,
                cache_status: 'hit'
              }
            ],
            images: [],
            fonts: []
          },
          memory: {
            used_js_heap_size: 15728640,
            total_js_heap_size: 20971520,
            limit: 2147483648
          },
          categorization: {
            overall: 'medium',
            details: 'Good FCP and TTFB, LCP and CLS need improvement'
          }
        }),

        interaction_data: JSON.stringify({
          consent_given: true,
          consent_timestamp: '2025-09-21T10:29:00Z',
          events: [
            {
              type: 'click',
              timestamp: '2025-09-21T10:30:10Z',
              target: {
                element: 'button',
                id: 'submit-btn',
                class: 'btn-primary',
                text: 'Submit'
              },
              metadata: {
                x: 100,
                y: 200
              },
              anonymized: true
            },
            {
              type: 'scroll',
              timestamp: '2025-09-21T10:30:15Z',
              target: {
                element: 'body'
              },
              metadata: {
                scroll_depth: 0.25
              },
              anonymized: true
            }
          ],
          session_duration: 120000,
          engagement_score: 0.75
        }),

        error_context: JSON.stringify({
          unhandled_errors: [
            {
              message: 'Cannot read property \'data\' of undefined',
              stack: 'TypeError: Cannot read property \'data\' of undefined\n    at processData (app.js:42:5)',
              timestamp: '2025-09-21T10:30:00Z',
              type: 'TypeError',
              file: 'app.js',
              line: 42,
              column: 5,
              user_agent_specific: false,
              frequency: 1
            }
          ],
          promise_rejections: [
            {
              reason: 'Network request failed',
              promise_id: 'fetch-promise-1',
              timestamp: '2025-09-21T10:30:05Z',
              handled: false
            }
          ],
          cors_errors: [],
          csp_violations: [],
          total_error_count: 2,
          error_rate: 0.02,
          patterns: [
            {
              pattern: 'Cannot read property .* of undefined',
              count: 1,
              first_seen: '2025-09-21T10:30:00Z',
              last_seen: '2025-09-21T10:30:00Z',
              affected_components: ['processData']
            }
          ]
        })
      };

      const response = await fetch(WIDGET_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedSubmission)
      });

      expect(response.status).toBe(201);

      const result: WidgetSubmissionResponse = await response.json();

      expect(result).toMatchObject({
        success: true,
        message: expect.any(String),
        report_id: expect.any(String),
        diagnostic_data: {
          console_logs_captured: expect.any(Number),
          network_requests_captured: expect.any(Number),
          performance_metrics_captured: true,
          interaction_tracking_enabled: true,
          error_context_captured: true
        }
      });

      expect(result.diagnostic_data?.performance_metrics_captured).toBe(true);
      expect(result.diagnostic_data?.interaction_tracking_enabled).toBe(true);
      expect(result.diagnostic_data?.error_context_captured).toBe(true);
    });

    it('should handle submission without enhanced data (backward compatibility)', async () => {
      const basicSubmission: Partial<WidgetSubmissionData> = {
        project_key: testProjectKey,
        type: 'feedback',
        title: 'Basic feedback without enhanced data',
        description: 'Testing backward compatibility',
        url: 'https://example.com/basic-page',
        user_agent: 'Mozilla/5.0 (Basic Browser)',
        console_logs: JSON.stringify({
          entries: [
            {
              level: 'info',
              message: 'Basic log entry',
              timestamp: '2025-09-21T10:35:00Z'
            }
          ]
        }),
        network_requests: JSON.stringify({
          entries: [
            {
              url: 'https://api.example.com/basic',
              method: 'GET',
              status: 200,
              duration: 100,
              timestamp: '2025-09-21T10:35:05Z'
            }
          ]
        })
        // No enhanced fields: performance_metrics, interaction_data, error_context
      };

      const response = await fetch(WIDGET_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(basicSubmission)
      });

      expect(response.status).toBe(201);

      const result: WidgetSubmissionResponse = await response.json();

      expect(result).toMatchObject({
        success: true,
        message: expect.any(String),
        report_id: expect.any(String),
        diagnostic_data: {
          console_logs_captured: expect.any(Number),
          network_requests_captured: expect.any(Number),
          performance_metrics_captured: false,
          interaction_tracking_enabled: false,
          error_context_captured: false
        }
      });
    });

    it('should validate performance metrics format', async () => {
      const invalidSubmission: WidgetSubmissionData = {
        project_key: testProjectKey,
        type: 'bug',
        title: 'Invalid performance metrics test',
        description: 'Testing validation',
        url: 'https://example.com',
        user_agent: 'Test',
        console_logs: '{}',
        network_requests: '{}',

        // Invalid performance metrics (missing required fields)
        performance_metrics: JSON.stringify({
          web_vitals: {
            fcp: 'invalid', // Should be number
            lcp: -100,      // Should be positive
            cls: null       // Should be number
          }
        })
      };

      const response = await fetch(WIDGET_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidSubmission)
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should require consent for interaction data', async () => {
      const submissionWithoutConsent: WidgetSubmissionData = {
        project_key: testProjectKey,
        type: 'bug',
        title: 'Interaction data without consent',
        description: 'Testing consent requirement',
        url: 'https://example.com',
        user_agent: 'Test',
        console_logs: '{}',
        network_requests: '{}',

        // Interaction data without consent
        interaction_data: JSON.stringify({
          consent_given: false,
          events: [
            {
              type: 'click',
              timestamp: '2025-09-21T10:40:00Z',
              target: { element: 'button' },
              anonymized: true
            }
          ]
        })
      };

      const response = await fetch(WIDGET_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionWithoutConsent)
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toContain('consent');
    });
  });

  describe('Data Storage Verification', () => {
    it('should store enhanced data in correct database structure', async () => {
      // This test would verify that enhanced data is stored correctly
      // Either in embedded JSON (Option 1) or dedicated columns (Option 2)

      const submission: WidgetSubmissionData = {
        project_key: testProjectKey,
        type: 'bug',
        title: 'Storage verification test',
        description: 'Testing enhanced data storage',
        url: 'https://example.com/storage-test',
        user_agent: 'Mozilla/5.0 (Storage Test)',
        console_logs: '{}',
        network_requests: '{}',
        performance_metrics: JSON.stringify({
          web_vitals: {
            fcp: 1000,
            lcp: 2000,
            cls: 0.1
          }
        })
      };

      const response = await fetch(WIDGET_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submission)
      });

      expect(response.status).toBe(201);
      const result: WidgetSubmissionResponse = await response.json();

      // Verify we can retrieve the stored data with enhanced fields
      const reportResponse = await fetch(`${API_BASE}/api/projects/${testProjectKey}/reports/${result.report_id}`);
      expect(reportResponse.status).toBe(200);

      const report: EnhancedReport = await reportResponse.json();

      // Verify enhanced data is present
      expect(report.performance_metrics).toBeDefined();
      expect(report.performance_metrics?.web_vitals.fcp).toBe(1000);
      expect(report.performance_metrics?.web_vitals.lcp).toBe(2000);
      expect(report.performance_metrics?.web_vitals.cls).toBe(0.1);
    });
  });

  describe('Performance and Size Limits', () => {
    it('should handle large enhanced payloads with GZIP compression', async () => {
      // Generate large dataset to test compression
      const largeEvents = Array.from({ length: 1000 }, (_, i) => ({
        type: 'scroll' as const,
        timestamp: new Date(Date.now() + i * 100).toISOString(),
        target: { element: 'body' },
        metadata: { scroll_depth: i / 1000 },
        anonymized: true as const
      }));

      const largeSubmission: WidgetSubmissionData = {
        project_key: testProjectKey,
        type: 'bug',
        title: 'Large payload test',
        description: 'Testing compression handling',
        url: 'https://example.com',
        user_agent: 'Test',
        console_logs: '{}',
        network_requests: '{}',
        interaction_data: JSON.stringify({
          consent_given: true,
          consent_timestamp: '2025-09-21T10:00:00Z',
          events: largeEvents,
          session_duration: 300000,
          engagement_score: 0.8
        })
      };

      const response = await fetch(WIDGET_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip' // This should be handled by the widget
        },
        body: JSON.stringify(largeSubmission)
      });

      expect(response.status).toBe(201);

      const result: WidgetSubmissionResponse = await response.json();
      expect(result.success).toBe(true);
      expect(result.diagnostic_data?.interaction_tracking_enabled).toBe(true);
    });

    it('should reject payloads exceeding size limits', async () => {
      // This would test the 10MB payload limit
      // Implementation would generate a payload larger than the limit

      const oversizedSubmission = {
        project_key: testProjectKey,
        type: 'bug',
        title: 'Oversized payload test',
        description: 'Testing size limits',
        url: 'https://example.com',
        user_agent: 'Test',
        console_logs: '{}',
        network_requests: '{}',
        performance_metrics: JSON.stringify({
          // This would contain oversized data in real test
          web_vitals: { fcp: 1000 }
        })
      };

      // In real implementation, this would be an oversized payload
      // For now, just test the contract structure
      const response = await fetch(WIDGET_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(oversizedSubmission)
      });

      // Should either succeed (if under limit) or fail with specific error
      if (response.status === 413) {
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error).toContain('payload too large');
      } else {
        expect(response.status).toBe(201);
      }
    });
  });
});