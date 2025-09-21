// Contract Test: Enhanced Export API
// Tests the enhanced export functionality with new formats
// CRITICAL: This test MUST FAIL until implementation is complete

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type {
  ExportOptions,
  ExportResult,
  ReportsQuery
} from '../../lib/types/diagnostics';

describe('Enhanced Export API Contract', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  let testProjectId: string;

  beforeAll(async () => {
    testProjectId = 'test-project-export-enhanced';
    // TODO: Set up test reports with enhanced data
  });

  afterAll(async () => {
    // Cleanup any generated export files
  });

  describe('JSON Export Format', () => {
    it('should export reports in structured JSON format with enhanced data', async () => {
      const exportOptions: ExportOptions = {
        format: 'json',
        fields: {
          basic: true,
          description: true,
          reporter: true,
          url_info: true,
          console_logs: {
            include: true,
            max_entries: 100,
            levels: ['error', 'warn', 'info']
          },
          network_requests: {
            include: true,
            max_entries: 50,
            include_timing: true,
            failed_only: false
          },
          performance_metrics: {
            include: true,
            web_vitals: true,
            categorization: true
          },
          error_context: {
            include: true,
            include_stack_traces: true,
            patterns_only: false
          },
          insights: true,
          correlations: true
        },
        options: {
          include_headers: true,
          date_format: 'iso',
          flatten_json: false,
          max_rows: 1000
        }
      };

      const query: ReportsQuery = {
        project_id: testProjectId,
        filters: {
          date_range: {
            from: '2025-09-01T00:00:00Z',
            to: '2025-09-21T23:59:59Z'
          }
        },
        pagination: { page: 1, limit: 100 }
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          export_options: exportOptions
        })
      });

      expect(response.status).toBe(200);

      const result: ExportResult = await response.json();

      expect(result).toMatchObject({
        success: true,
        export_id: expect.any(String),
        format: 'json',
        report_count: expect.any(Number),
        file_size: expect.any(Number),
        download_url: expect.any(String),
        expires_at: expect.any(String)
      });

      // Verify the exported file is accessible
      const downloadResponse = await fetch(result.download_url!);
      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers.get('content-type')).toContain('application/json');

      const exportedData = await downloadResponse.json();

      // Verify JSON structure
      expect(exportedData).toMatchObject({
        export_metadata: {
          generated_at: expect.any(String),
          format: 'json',
          total_reports: expect.any(Number),
          project_id: testProjectId
        },
        reports: expect.any(Array)
      });

      // Verify enhanced data is included
      if (exportedData.reports.length > 0) {
        const firstReport = exportedData.reports[0];
        expect(firstReport).toHaveProperty('id');
        expect(firstReport).toHaveProperty('title');

        // Enhanced fields should be present if available
        if (firstReport.performance_metrics) {
          expect(firstReport.performance_metrics).toHaveProperty('web_vitals');
          expect(firstReport.performance_metrics).toHaveProperty('categorization');
        }

        if (firstReport.error_context) {
          expect(firstReport.error_context).toHaveProperty('total_error_count');
          expect(firstReport.error_context).toHaveProperty('unhandled_errors');
        }
      }
    });

    it('should support NDJSON format for streaming large datasets', async () => {
      const exportOptions: ExportOptions = {
        format: 'ndjson',
        fields: {
          basic: true,
          performance_metrics: {
            include: true,
            web_vitals: true,
            categorization: false
          }
        },
        options: {
          max_rows: 10000
        }
      };

      const query: ReportsQuery = {
        project_id: testProjectId,
        pagination: { page: 1, limit: 1000 }
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          export_options: exportOptions
        })
      });

      expect(response.status).toBe(200);

      const result: ExportResult = await response.json();
      expect(result.format).toBe('ndjson');

      // Verify NDJSON format (newline-delimited JSON)
      const downloadResponse = await fetch(result.download_url!);
      const ndjsonData = await downloadResponse.text();

      const lines = ndjsonData.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);

      // Each line should be valid JSON
      lines.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();
      });

      // First line should be a valid report
      const firstReport = JSON.parse(lines[0]);
      expect(firstReport).toHaveProperty('id');
      expect(firstReport).toHaveProperty('title');
    });
  });

  describe('Excel Export Format', () => {
    it('should export reports in Excel format with multiple sheets', async () => {
      const exportOptions: ExportOptions = {
        format: 'excel',
        fields: {
          basic: true,
          description: true,
          console_logs: {
            include: true,
            max_entries: 50
          },
          network_requests: {
            include: true,
            max_entries: 30,
            include_timing: true
          },
          performance_metrics: {
            include: true,
            web_vitals: true,
            categorization: true
          },
          error_context: {
            include: true,
            patterns_only: true
          }
        },
        options: {
          include_headers: true,
          max_rows: 500
        }
      };

      const query: ReportsQuery = {
        project_id: testProjectId,
        pagination: { page: 1, limit: 100 }
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          export_options: exportOptions
        })
      });

      expect(response.status).toBe(200);

      const result: ExportResult = await response.json();

      expect(result).toMatchObject({
        success: true,
        format: 'excel',
        report_count: expect.any(Number),
        download_url: expect.any(String)
      });

      // Verify Excel file is downloadable
      const downloadResponse = await fetch(result.download_url!);
      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers.get('content-type')).toContain('application/vnd.openxmlformats');

      // Note: In a real test, you would use a library like 'exceljs' to parse and verify the Excel content
      // For now, just verify the file can be downloaded
      const excelBuffer = await downloadResponse.arrayBuffer();
      expect(excelBuffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('Enhanced CSV Export', () => {
    it('should export CSV with enhanced fields and proper formatting', async () => {
      const exportOptions: ExportOptions = {
        format: 'csv',
        fields: {
          basic: true,
          description: true,
          reporter: true,
          url_info: true,
          performance_metrics: {
            include: true,
            web_vitals: true,
            categorization: true
          },
          error_context: {
            include: true,
            include_stack_traces: false,
            patterns_only: true
          }
        },
        options: {
          include_headers: true,
          date_format: 'iso',
          flatten_json: true
        }
      };

      const query: ReportsQuery = {
        project_id: testProjectId,
        filters: {
          has_metrics: true
        },
        pagination: { page: 1, limit: 50 }
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          export_options: exportOptions
        })
      });

      expect(response.status).toBe(200);

      const result: ExportResult = await response.json();
      expect(result.format).toBe('csv');

      // Verify CSV content
      const downloadResponse = await fetch(result.download_url!);
      expect(downloadResponse.headers.get('content-type')).toContain('text/csv');

      const csvContent = await downloadResponse.text();
      const lines = csvContent.trim().split('\n');

      // Should have headers
      expect(lines.length).toBeGreaterThan(1);

      const headers = lines[0].split(',');
      expect(headers).toContain('id');
      expect(headers).toContain('title');
      expect(headers).toContain('type');

      // Enhanced fields should be flattened
      expect(headers.some(h => h.includes('performance_metrics'))).toBe(true);
      expect(headers.some(h => h.includes('web_vitals'))).toBe(true);

      // Verify data rows
      if (lines.length > 1) {
        const firstDataRow = lines[1].split(',');
        expect(firstDataRow.length).toBe(headers.length);
      }
    });
  });

  describe('Export Templates and Scheduling', () => {
    it('should support custom export templates', async () => {
      const templateDefinition = {
        name: 'Performance Analysis Template',
        description: 'Export focused on performance metrics and Core Web Vitals',
        export_options: {
          format: 'json' as const,
          fields: {
            basic: true,
            performance_metrics: {
              include: true,
              web_vitals: true,
              categorization: true
            },
            insights: true
          }
        },
        default_query: {
          filters: {
            has_metrics: true,
            performance: ['critical' as const, 'high' as const]
          }
        }
      };

      // Create template
      const createResponse = await fetch(`${API_BASE}/api/projects/${testProjectId}/export-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateDefinition)
      });

      expect(createResponse.status).toBe(201);

      const createdTemplate = await createResponse.json();
      expect(createdTemplate).toMatchObject({
        id: expect.any(String),
        name: templateDefinition.name,
        created_at: expect.any(String)
      });

      // Use template for export
      const exportResponse = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: createdTemplate.id,
          query_overrides: {
            pagination: { page: 1, limit: 20 }
          }
        })
      });

      expect(exportResponse.status).toBe(200);

      const exportResult: ExportResult = await exportResponse.json();
      expect(exportResult.success).toBe(true);
    });

    it('should support scheduled exports', async () => {
      const scheduleDefinition = {
        name: 'Weekly Performance Report',
        template_id: 'performance-template-1',
        schedule: {
          frequency: 'weekly',
          day_of_week: 1, // Monday
          hour: 9,
          timezone: 'UTC'
        },
        delivery: {
          email: 'admin@example.com',
          format: 'excel'
        },
        query: {
          filters: {
            date_range: {
              type: 'relative',
              period: 'last_7_days'
            },
            has_metrics: true
          }
        }
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/export-schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleDefinition)
      });

      expect(response.status).toBe(201);

      const createdSchedule = await response.json();
      expect(createdSchedule).toMatchObject({
        id: expect.any(String),
        name: scheduleDefinition.name,
        status: 'active',
        next_run_at: expect.any(String),
        created_at: expect.any(String)
      });
    });
  });

  describe('Export Performance and Limits', () => {
    it('should handle large dataset exports with compression', async () => {
      const exportOptions: ExportOptions = {
        format: 'json',
        fields: {
          basic: true,
          console_logs: { include: true },
          network_requests: { include: true },
          performance_metrics: { include: true, web_vitals: true },
          error_context: { include: true }
        },
        options: {
          compress: true,
          max_rows: 5000
        }
      };

      const query: ReportsQuery = {
        project_id: testProjectId,
        pagination: { page: 1, limit: 1000 }
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          export_options: exportOptions
        })
      });

      expect(response.status).toBe(200);

      const result: ExportResult = await response.json();
      expect(result.success).toBe(true);

      // Verify compressed file
      const downloadResponse = await fetch(result.download_url!);
      expect(downloadResponse.headers.get('content-encoding')).toBe('gzip');
    });

    it('should enforce export size limits', async () => {
      const exportOptions: ExportOptions = {
        format: 'json',
        fields: {
          basic: true,
          console_logs: { include: true, max_entries: 1000 },
          network_requests: { include: true, max_entries: 1000 },
          performance_metrics: { include: true, web_vitals: true },
          error_context: { include: true, include_stack_traces: true }
        },
        options: {
          max_rows: 100000 // Very large limit to test enforcement
        }
      };

      const query: ReportsQuery = {
        project_id: testProjectId,
        pagination: { page: 1, limit: 50000 }
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          export_options: exportOptions
        })
      });

      // Should either succeed with limit applied or return error
      if (response.status === 413) {
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error).toContain('export size limit');
      } else {
        expect(response.status).toBe(200);
        const result: ExportResult = await response.json();
        expect(result.report_count).toBeLessThanOrEqual(10000); // Reasonable limit
      }
    });

    it('should track export history and cleanup old files', async () => {
      // Get export history
      const historyResponse = await fetch(`${API_BASE}/api/projects/${testProjectId}/export-history`);

      expect(historyResponse.status).toBe(200);

      const history = await historyResponse.json();
      expect(history).toMatchObject({
        exports: expect.any(Array),
        total_count: expect.any(Number)
      });

      if (history.exports.length > 0) {
        expect(history.exports[0]).toMatchObject({
          export_id: expect.any(String),
          format: expect.any(String),
          created_at: expect.any(String),
          expires_at: expect.any(String),
          status: expect.stringMatching(/completed|failed|expired/),
          file_size: expect.any(Number)
        });
      }
    });
  });

  describe('Export Field Validation', () => {
    it('should validate export options and return helpful errors', async () => {
      const invalidExportOptions = {
        format: 'invalid_format', // Invalid format
        fields: {
          basic: true,
          performance_metrics: {
            include: true,
            invalid_field: true // Invalid field
          }
        }
      };

      const response = await fetch(`${API_BASE}/api/projects/${testProjectId}/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: { project_id: testProjectId, pagination: { page: 1, limit: 10 } },
          export_options: invalidExportOptions
        })
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
      expect(result.details).toBeDefined();
    });
  });
});