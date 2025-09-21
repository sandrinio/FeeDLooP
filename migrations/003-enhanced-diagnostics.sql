-- Enhanced Log Visualization - Database Schema Extension
-- Execute this script in Supabase to add optional dedicated columns
-- File: migrations/003-enhanced-diagnostics.sql
-- Version: 1.0.0
-- Date: 2025-09-21

-- ============================================================================
-- Schema Changes - Option 2 (Dedicated Columns)
-- ============================================================================

-- Add new JSON columns for enhanced diagnostic data
ALTER TABLE fl_reports
ADD COLUMN IF NOT EXISTS performance_metrics JSON,
ADD COLUMN IF NOT EXISTS interaction_data JSON,
ADD COLUMN IF NOT EXISTS error_context JSON;

-- ============================================================================
-- Performance Indexes for Query Optimization
-- ============================================================================

-- Core Web Vitals indexes for filtering and sorting (using CAST for compatibility)
CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_lcp
ON fl_reports(CAST(performance_metrics->'web_vitals'->>'lcp' AS numeric));

CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_fcp
ON fl_reports(CAST(performance_metrics->'web_vitals'->>'fcp' AS numeric));

CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_cls
ON fl_reports(CAST(performance_metrics->'web_vitals'->>'cls' AS numeric));

CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_fid
ON fl_reports(CAST(performance_metrics->'web_vitals'->>'fid' AS numeric));

CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_tti
ON fl_reports(CAST(performance_metrics->'web_vitals'->>'tti' AS numeric));

CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_ttfb
ON fl_reports(CAST(performance_metrics->'web_vitals'->>'ttfb' AS numeric));

-- Performance categorization index (text doesn't need casting)
CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_category
ON fl_reports((performance_metrics->'categorization'->>'overall'));

-- Error context indexes
CREATE INDEX IF NOT EXISTS idx_fl_reports_error_count
ON fl_reports(CAST(error_context->>'total_error_count' AS numeric));

CREATE INDEX IF NOT EXISTS idx_fl_reports_error_rate
ON fl_reports(CAST(error_context->>'error_rate' AS numeric));

-- Interaction data indexes
CREATE INDEX IF NOT EXISTS idx_fl_reports_interaction_consent
ON fl_reports(CAST(interaction_data->>'consent_given' AS boolean));

CREATE INDEX IF NOT EXISTS idx_fl_reports_engagement_score
ON fl_reports(CAST(interaction_data->>'engagement_score' AS numeric));

-- ============================================================================
-- Column Documentation
-- ============================================================================

COMMENT ON COLUMN fl_reports.performance_metrics IS
'Core Web Vitals and performance timing data collected from browser Performance Observer API. Includes FCP, LCP, CLS, FID, TTI, TTFB metrics plus resource timing and memory usage.';

COMMENT ON COLUMN fl_reports.interaction_data IS
'Anonymized user interaction tracking data (requires explicit user consent). Includes click, scroll, input events with timestamps and engagement metrics. No PII stored.';

COMMENT ON COLUMN fl_reports.error_context IS
'Enhanced error information including unhandled errors, promise rejections, CORS errors, CSP violations, and detected error patterns with correlation data.';

-- ============================================================================
-- Backward Compatibility Validation
-- ============================================================================

-- Verify existing data structure is preserved
DO $$
BEGIN
    -- Check that existing columns still exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fl_reports'
        AND column_name = 'console_logs'
    ) THEN
        RAISE EXCEPTION 'Backward compatibility check failed: console_logs column missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fl_reports'
        AND column_name = 'network_requests'
    ) THEN
        RAISE EXCEPTION 'Backward compatibility check failed: network_requests column missing';
    END IF;

    RAISE NOTICE 'Backward compatibility validation passed';
END $$;

-- ============================================================================
-- Migration Verification Queries
-- ============================================================================

-- Verify new columns were added
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN column_name IN ('performance_metrics', 'interaction_data', 'error_context')
    THEN '✓ NEW COLUMN'
    ELSE 'existing'
  END as status
FROM information_schema.columns
WHERE table_name = 'fl_reports'
  AND column_name IN ('id', 'console_logs', 'network_requests', 'performance_metrics', 'interaction_data', 'error_context')
ORDER BY
  CASE column_name
    WHEN 'id' THEN 1
    WHEN 'console_logs' THEN 2
    WHEN 'network_requests' THEN 3
    WHEN 'performance_metrics' THEN 4
    WHEN 'interaction_data' THEN 5
    WHEN 'error_context' THEN 6
  END;

-- Show new performance indexes
SELECT
  indexname,
  indexdef,
  '✓ NEW INDEX' as status
FROM pg_indexes
WHERE tablename = 'fl_reports'
  AND (indexname LIKE 'idx_fl_reports_perf_%'
   OR indexname LIKE 'idx_fl_reports_error_%'
   OR indexname LIKE 'idx_fl_reports_interaction_%'
   OR indexname LIKE 'idx_fl_reports_engagement_%')
ORDER BY indexname;

-- ============================================================================
-- Sample Data Structure Examples
-- ============================================================================

-- Example of what enhanced data will look like:
/*
performance_metrics example:
{
  "web_vitals": {
    "fcp": 1200,
    "lcp": 2100,
    "cls": 0.05,
    "fid": 80,
    "tti": 3500,
    "ttfb": 400
  },
  "categorization": {
    "overall": "medium",
    "details": "Good FCP and LCP, low CLS, TTI needs improvement"
  },
  "memory": {
    "used_js_heap_size": 15728640,
    "total_js_heap_size": 20971520,
    "limit": 2147483648
  }
}

interaction_data example:
{
  "consent_given": true,
  "consent_timestamp": "2025-09-21T10:30:00Z",
  "events": [
    {
      "type": "click",
      "timestamp": "2025-09-21T10:31:15Z",
      "target": {
        "element": "button",
        "id": "submit-btn",
        "class": "btn-primary"
      },
      "anonymized": true
    }
  ],
  "session_duration": 120000,
  "engagement_score": 0.75
}

error_context example:
{
  "unhandled_errors": [
    {
      "message": "Cannot read property 'data' of undefined",
      "stack": "TypeError: Cannot read property...",
      "timestamp": "2025-09-21T10:32:00Z",
      "type": "TypeError",
      "file": "app.js",
      "line": 42,
      "frequency": 3
    }
  ],
  "total_error_count": 5,
  "error_rate": 0.05,
  "patterns": [
    {
      "pattern": "Cannot read property .* of undefined",
      "count": 3,
      "first_seen": "2025-09-21T10:30:00Z",
      "last_seen": "2025-09-21T10:32:00Z"
    }
  ]
}
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Enhanced Log Visualization Schema Migration';
    RAISE NOTICE 'Version: 1.0.0';
    RAISE NOTICE 'Status: COMPLETED SUCCESSFULLY';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Added columns: performance_metrics, interaction_data, error_context';
    RAISE NOTICE 'Added indexes: 9 performance indexes for query optimization';
    RAISE NOTICE 'Backward compatibility: PRESERVED';
    RAISE NOTICE 'Next steps: Update API endpoints to handle new data structure';
    RAISE NOTICE '===========================================';
END $$;