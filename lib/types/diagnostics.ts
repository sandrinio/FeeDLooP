// Enhanced Log Visualization - Core TypeScript Interfaces
// Defines data structures for performance metrics, error context, and user interactions

import { z } from 'zod'

// ============================================================================
// Core Report Enhancement Types
// ============================================================================

export interface EnhancedReport extends ExistingReport {
  performance_metrics?: PerformanceMetrics;
  interaction_data?: InteractionData;
  error_context?: ErrorContext;
}

export interface ExistingReport {
  id: string;
  project_id: string;
  type: 'bug' | 'initiative' | 'feedback';
  title: string;
  description: string;
  status: 'active' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical' | null;
  reporter_email?: string;
  reporter_name?: string;
  url?: string;
  user_agent?: string;
  console_logs?: ConsoleLogData;
  network_requests?: NetworkRequestData;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Enhanced Console Logs Structure
// ============================================================================

export interface ConsoleLogData {
  entries: LogEntry[];
  // New embedded fields for Option 1
  performance_metrics?: PerformanceMetrics;
  error_context?: ErrorContext;
  metadata?: {
    total_count: number;
    error_count: number;
    warning_count: number;
    truncated: boolean;
  };
}

export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'log' | 'debug';
  message: string;
  timestamp: string;
  stack?: string;
  // New fields
  correlation_id?: string; // Links to network requests
  pattern_hash?: string;   // For pattern detection
  occurrence_count?: number;
  source?: {
    file: string;
    line: number;
    column: number;
  };
}

// ============================================================================
// Enhanced Network Request Structure
// ============================================================================

export interface NetworkRequestData {
  entries: NetworkEntry[];
  metadata?: {
    total_requests: number;
    failed_requests: number;
    total_duration: number;
    total_size: number;
  };
}

export interface NetworkEntry {
  // Existing fields
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: string;

  // Enhanced fields
  id: string; // For correlation
  type: 'xhr' | 'fetch' | 'script' | 'stylesheet' | 'image' | 'font' | 'other';
  size: {
    request: number;
    response: number;
    total: number;
  };
  timing: {
    dns?: number;
    tcp?: number;
    ssl?: number;
    request: number;
    response: number;
    total: number;
  };
  priority: 'critical' | 'high' | 'medium' | 'low';
  initiator?: string;
  correlation_id?: string; // Links to console errors
  cache_status?: 'hit' | 'miss' | 'dynamic';
}

// ============================================================================
// Performance Metrics (New)
// ============================================================================

export interface PerformanceMetrics {
  web_vitals: WebVitals;
  custom_metrics?: {
    dom_ready?: number;
    window_load?: number;
    first_paint?: number;
  };
  resource_timing?: {
    scripts: ResourceTiming[];
    stylesheets: ResourceTiming[];
    images: ResourceTiming[];
    fonts: ResourceTiming[];
  };
  memory?: {
    used_js_heap_size?: number;
    total_js_heap_size?: number;
    limit?: number;
  };
  categorization?: {
    overall: 'critical' | 'high' | 'medium' | 'low';
    details: string;
  };
}

export interface WebVitals {
  fcp?: number;  // First Contentful Paint (ms)
  lcp?: number;  // Largest Contentful Paint (ms)
  cls?: number;  // Cumulative Layout Shift (score)
  fid?: number;  // First Input Delay (ms)
  tti?: number;  // Time to Interactive (ms)
  ttfb?: number; // Time to First Byte (ms)
}

export interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  cache_status: 'hit' | 'miss';
  blocking_time?: number;
}

// ============================================================================
// Interaction Data (New)
// ============================================================================

export interface InteractionData {
  consent_given: boolean;
  consent_timestamp?: string;
  events: InteractionEvent[];
  session_duration?: number;
  engagement_score?: number;
}

export interface InteractionEvent {
  type: 'click' | 'scroll' | 'input' | 'navigation' | 'resize';
  timestamp: string;
  target?: {
    element: string;
    id?: string;
    class?: string;
    text?: string;
  };
  metadata?: {
    x?: number;
    y?: number;
    scroll_depth?: number;
    input_length?: number;
    navigation_from?: string;
    navigation_to?: string;
  };
  // Privacy: No PII stored
  anonymized: true;
}

// ============================================================================
// Error Context (New)
// ============================================================================

export interface ErrorContext {
  unhandled_errors: ErrorDetail[];
  promise_rejections: PromiseRejection[];
  cors_errors: CorsError[];
  csp_violations: CspViolation[];
  total_error_count: number;
  error_rate?: number;
  patterns?: ErrorPattern[];
}

export interface ErrorDetail {
  message: string;
  stack: string;
  timestamp: string;
  type: string;
  file?: string;
  line?: number;
  column?: number;
  user_agent_specific?: boolean;
  frequency?: number;
}

export interface PromiseRejection {
  reason: string;
  promise_id?: string;
  timestamp: string;
  handled: boolean;
}

export interface CorsError {
  url: string;
  timestamp: string;
  type: 'no-cors' | 'cors-failed' | 'preflight-failed';
}

export interface CspViolation {
  directive: string;
  blocked_uri: string;
  timestamp: string;
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  first_seen: string;
  last_seen: string;
  affected_components?: string[];
}

// ============================================================================
// Widget API Types
// ============================================================================

export interface WidgetSubmissionData {
  // Existing fields
  project_key: string;
  type: 'bug' | 'initiative' | 'feedback';
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  reporter_name?: string;
  reporter_email?: string;
  url: string;
  user_agent: string;

  // Enhanced fields
  console_logs: string;        // JSON string with enhanced structure
  network_requests: string;    // JSON string with timing data
  performance_metrics?: string; // JSON string with Web Vitals
  interaction_data?: string;    // JSON string (if consent given)
  error_context?: string;       // JSON string with error details
}

export interface WidgetSubmissionResponse {
  success: boolean;
  message: string;
  report_id?: string;
  attachments_uploaded?: number;
  total_attachments?: number;
  diagnostic_data?: {
    console_logs_captured: number;
    network_requests_captured: number;
    performance_metrics_captured: boolean;
    interaction_tracking_enabled: boolean;
    error_context_captured: boolean;
  };
  error?: string;
  details?: Record<string, any>;
}

// ============================================================================
// Visualization Types
// ============================================================================

export interface WaterfallChartData {
  requests: NetworkEntry[];
  start_time: string;
  end_time: string;
  critical_path: string[];
  timeline: {
    min_time: number;
    max_time: number;
    scale_factor: number;
  };
}

export interface PerformanceThresholds {
  lcp: { good: number; poor: number };
  fcp: { good: number; poor: number };
  cls: { good: number; poor: number };
  fid: { good: number; poor: number };
  tti: { good: number; poor: number };
}

export interface ErrorCorrelation {
  error_id: string;
  network_request_id: string;
  confidence: number;
  correlation_type: 'timing' | 'url_match' | 'status_code' | 'pattern';
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'ndjson';
  fields: {
    basic: boolean;
    description: boolean;
    reporter: boolean;
    url_info: boolean;
    console_logs?: {
      include: boolean;
      max_entries?: number;
      levels?: ('error' | 'warn' | 'info' | 'log')[];
    };
    network_requests?: {
      include: boolean;
      max_entries?: number;
      failed_only?: boolean;
      include_timing?: boolean;
    };
    performance_metrics?: {
      include: boolean;
      web_vitals: boolean;
      categorization: boolean;
    };
    error_context?: {
      include: boolean;
      include_stack_traces?: boolean;
      patterns_only?: boolean;
    };
    insights?: boolean;
    correlations?: boolean;
  };
  options?: {
    compress?: boolean;
    include_headers?: boolean;
    date_format?: string;
    flatten_json?: boolean;
    max_rows?: number;
  };
}

export interface ExportResult {
  success: boolean;
  export_id?: string;
  format: string;
  report_count: number;
  file_size?: number;
  download_url?: string;
  expires_at?: string;
}

// ============================================================================
// Database Query Types
// ============================================================================

export interface ReportsQuery {
  project_id: string;
  filters?: {
    type?: ('bug' | 'initiative' | 'feedback')[];
    priority?: ('low' | 'medium' | 'high' | 'critical')[];
    date_range?: {
      from: string;
      to: string;
    };
    performance?: ('critical' | 'high' | 'medium' | 'low')[];
    has_errors?: boolean;
    has_metrics?: boolean;
    error_count?: {
      min?: number;
      max?: number;
    };
  };
  sort?: {
    column: 'created_at' | 'updated_at' | 'title' | 'priority' | 'lcp' | 'error_count';
    direction: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    limit: number;
  };
  include?: string[];
}

export interface ReportsResponse {
  success: boolean;
  reports: EnhancedReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters_applied?: Record<string, any>;
  aggregations?: {
    total_by_type: Record<string, number>;
    total_by_performance: Record<string, number>;
  };
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const WebVitalsSchema = z.object({
  fcp: z.number().optional(),
  lcp: z.number().optional(),
  cls: z.number().optional(),
  fid: z.number().optional(),
  tti: z.number().optional(),
  ttfb: z.number().optional()
});

export const PerformanceMetricsSchema = z.object({
  web_vitals: WebVitalsSchema,
  custom_metrics: z.object({
    dom_ready: z.number().optional(),
    window_load: z.number().optional(),
    first_paint: z.number().optional()
  }).optional(),
  resource_timing: z.object({
    scripts: z.array(z.any()).optional(),
    stylesheets: z.array(z.any()).optional(),
    images: z.array(z.any()).optional(),
    fonts: z.array(z.any()).optional()
  }).optional(),
  memory: z.object({
    used_js_heap_size: z.number().optional(),
    total_js_heap_size: z.number().optional(),
    limit: z.number().optional()
  }).optional(),
  categorization: z.object({
    overall: z.enum(['critical', 'high', 'medium', 'low']),
    details: z.string()
  }).optional()
});

export const InteractionDataSchema = z.object({
  consent_given: z.boolean(),
  consent_timestamp: z.string().optional(),
  events: z.array(z.object({
    type: z.enum(['click', 'scroll', 'input', 'navigation', 'resize']),
    timestamp: z.string(),
    target: z.object({
      element: z.string(),
      id: z.string().optional(),
      class: z.string().optional(),
      text: z.string().optional()
    }).optional(),
    metadata: z.record(z.any()).optional(),
    anonymized: z.literal(true)
  })),
  session_duration: z.number().optional(),
  engagement_score: z.number().optional()
});

export const ErrorContextSchema = z.object({
  unhandled_errors: z.array(z.object({
    message: z.string(),
    stack: z.string(),
    timestamp: z.string(),
    type: z.string(),
    file: z.string().optional(),
    line: z.number().optional(),
    column: z.number().optional(),
    user_agent_specific: z.boolean().optional(),
    frequency: z.number().optional()
  })),
  promise_rejections: z.array(z.object({
    reason: z.string(),
    promise_id: z.string().optional(),
    timestamp: z.string(),
    handled: z.boolean()
  })),
  cors_errors: z.array(z.object({
    url: z.string(),
    timestamp: z.string(),
    type: z.enum(['no-cors', 'cors-failed', 'preflight-failed'])
  })),
  csp_violations: z.array(z.object({
    directive: z.string(),
    blocked_uri: z.string(),
    timestamp: z.string()
  })),
  total_error_count: z.number(),
  error_rate: z.number().optional(),
  patterns: z.array(z.object({
    pattern: z.string(),
    count: z.number(),
    first_seen: z.string(),
    last_seen: z.string(),
    affected_components: z.array(z.string()).optional()
  })).optional()
});