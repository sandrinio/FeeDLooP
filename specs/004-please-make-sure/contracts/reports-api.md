# Reports API Contract: Enhanced Visualization Endpoints

## GET /api/projects/{projectId}/reports (Enhanced)

### Description
Retrieve project reports with enhanced filtering, sorting, and diagnostic data options.

### Request

#### Path Parameters
- `projectId`: string (UUID) - Required

#### Query Parameters
```typescript
{
  // Pagination
  page?: number;          // Default: 1
  limit?: number;         // Default: 20, Max: 100

  // Filtering
  filter?: {
    type?: 'bug' | 'initiative' | 'feedback';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    title?: string;       // Partial match
    dateFrom?: string;    // ISO 8601
    dateTo?: string;      // ISO 8601

    // New filters
    performance?: 'critical' | 'high' | 'medium' | 'low';
    hasErrors?: boolean;
    hasMetrics?: boolean;
    errorCount?: {
      min?: number;
      max?: number;
    };
  };

  // Sorting
  sort?: {
    column: 'created_at' | 'updated_at' | 'title' | 'priority' | 'lcp' | 'error_count';
    direction: 'asc' | 'desc';
  };

  // Include options
  include?: string[];     // ['diagnostics', 'metrics', 'patterns']
}
```

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "reports": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "project_id": "660e8400-e29b-41d4-a716-446655440001",
      "type": "bug",
      "title": "Checkout page crashes on mobile",
      "description": "...",
      "priority": "high",
      "status": "active",
      "url": "https://example.com/checkout",
      "created_at": "2024-01-20T10:30:00Z",

      // Enhanced fields (when include=['diagnostics'])
      "diagnostic_summary": {
        "console_log_count": 150,
        "error_count": 5,
        "warning_count": 12,
        "network_request_count": 45,
        "failed_requests": 2
      },

      // Performance summary (when include=['metrics'])
      "performance_summary": {
        "category": "high",
        "web_vitals": {
          "lcp": 3500,
          "fcp": 1200,
          "cls": 0.15
        }
      },

      // Pattern summary (when include=['patterns'])
      "pattern_summary": {
        "repeated_errors": 3,
        "error_patterns": ["NetworkError", "TypeError"],
        "correlation_found": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "pages": 8
  },
  "filters_applied": {
    "type": "bug",
    "performance": "high"
  },
  "aggregations": {
    "total_by_type": {
      "bug": 45,
      "initiative": 30,
      "feedback": 70
    },
    "total_by_performance": {
      "critical": 5,
      "high": 15,
      "medium": 40,
      "low": 85
    }
  }
}
```

## GET /api/projects/{projectId}/reports/{reportId} (Enhanced)

### Description
Retrieve detailed report with full diagnostic data and visualizations.

### Request

#### Path Parameters
- `projectId`: string (UUID) - Required
- `reportId`: string (UUID) - Required

#### Query Parameters
```typescript
{
  // Data inclusion options
  include?: {
    console_logs?: boolean;      // Default: true
    network_requests?: boolean;   // Default: true
    performance_metrics?: boolean;// Default: true
    interaction_data?: boolean;   // Default: false (privacy)
    error_context?: boolean;      // Default: true
    attachments?: boolean;        // Default: true
    correlations?: boolean;       // Default: true
  };

  // Processing options
  process?: {
    detect_patterns?: boolean;    // Default: true
    calculate_insights?: boolean; // Default: true
    generate_waterfall?: boolean; // Default: true
  };
}
```

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "report": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "660e8400-e29b-41d4-a716-446655440001",
    "type": "bug",
    "title": "Checkout page crashes on mobile",
    "description": "<p>Page becomes unresponsive...</p>",
    "priority": "high",
    "status": "active",
    "reporter_name": "John Doe",
    "reporter_email": "john@example.com",
    "url": "https://example.com/checkout",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2024-01-20T10:30:00Z",
    "updated_at": "2024-01-20T10:30:00Z",

    // Full diagnostic data
    "console_logs": {
      "entries": [...],
      "metadata": {
        "total_count": 150,
        "error_count": 5,
        "warning_count": 12,
        "truncated": false
      }
    },

    "network_requests": {
      "entries": [...],
      "metadata": {
        "total_requests": 45,
        "failed_requests": 2,
        "total_duration": 15234,
        "total_size": 524288
      },
      "waterfall": {
        "start_time": "2024-01-20T10:29:00Z",
        "end_time": "2024-01-20T10:30:15Z",
        "critical_path": ["req-1", "req-5", "req-12"]
      }
    },

    "performance_metrics": {
      "web_vitals": {
        "lcp": 3500,
        "fcp": 1200,
        "cls": 0.15,
        "fid": 150,
        "tti": 4500,
        "ttfb": 450
      },
      "categorization": {
        "overall": "high",
        "details": "LCP and CLS need improvement"
      }
    },

    "error_context": {
      "unhandled_errors": [...],
      "promise_rejections": [...],
      "patterns": [
        {
          "pattern": "NetworkError at checkout.js:142",
          "count": 3,
          "first_seen": "2024-01-20T10:29:45Z",
          "last_seen": "2024-01-20T10:30:10Z"
        }
      ]
    },

    "correlations": {
      "error_to_network": [
        {
          "error_id": "err-1",
          "network_request_id": "net-req-123",
          "confidence": 0.95
        }
      ],
      "patterns_detected": [
        "Failed API calls trigger UI errors",
        "Memory leak in checkout component"
      ]
    },

    "insights": {
      "performance": [
        "LCP is 1s above recommended threshold",
        "CLS indicates layout stability issues"
      ],
      "errors": [
        "Network failures correlate with peak traffic",
        "TypeError occurs after 3rd party script loads"
      ],
      "recommendations": [
        "Implement retry logic for API calls",
        "Lazy load non-critical resources",
        "Fix layout shift in product images"
      ]
    },

    "attachments": [
      {
        "id": "att-1",
        "filename": "screenshot.png",
        "file_size": 245632,
        "url": "/api/attachments/att-1"
      }
    ]
  }
}
```

## GET /api/projects/{projectId}/reports/{reportId}/performance

### Description
Get detailed performance analysis for a specific report.

### Request

#### Path Parameters
- `projectId`: string (UUID) - Required
- `reportId`: string (UUID) - Required

#### Query Parameters
```typescript
{
  format?: 'json' | 'lighthouse';  // Default: json
  compare_to?: string;              // Another report ID for comparison
}
```

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "performance": {
    "report_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-20T10:30:00Z",

    "scores": {
      "performance": 65,
      "accessibility": 85,
      "best_practices": 90,
      "seo": 95
    },

    "metrics": {
      "web_vitals": {
        "lcp": {
          "value": 3500,
          "score": "needs-improvement",
          "percentile": 75
        },
        "fcp": {
          "value": 1200,
          "score": "good",
          "percentile": 45
        },
        "cls": {
          "value": 0.15,
          "score": "needs-improvement",
          "percentile": 70
        },
        "fid": {
          "value": 150,
          "score": "needs-improvement",
          "percentile": 65
        },
        "tti": {
          "value": 4500,
          "score": "poor",
          "percentile": 80
        }
      }
    },

    "opportunities": [
      {
        "title": "Eliminate render-blocking resources",
        "impact": "high",
        "estimated_savings": "1.2s",
        "resources": [
          "/css/main.css",
          "/js/vendor.js"
        ]
      },
      {
        "title": "Optimize images",
        "impact": "medium",
        "estimated_savings": "450KB",
        "resources": [
          "/images/hero.jpg",
          "/images/products/*.png"
        ]
      }
    ],

    "diagnostics": [
      {
        "title": "Largest Contentful Paint element",
        "element": "<img src='/images/hero.jpg'>",
        "timing": 3500
      },
      {
        "title": "Layout shifts",
        "elements": [
          ".product-grid",
          ".newsletter-form"
        ],
        "total_shift": 0.15
      }
    ],

    "comparison": {
      "to_report_id": "660e8400-e29b-41d4-a716-446655440002",
      "improvements": {
        "lcp": -500,
        "fcp": -100,
        "cls": 0.05
      },
      "regressions": {
        "tti": 200
      }
    }
  }
}
```

## GET /api/projects/{projectId}/reports/patterns

### Description
Analyze patterns across multiple reports.

### Request

#### Path Parameters
- `projectId`: string (UUID) - Required

#### Query Parameters
```typescript
{
  date_range?: {
    from: string;  // ISO 8601
    to: string;    // ISO 8601
  };
  min_occurrences?: number;  // Default: 2
  pattern_types?: string[];   // ['error', 'performance', 'network']
}
```

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "patterns": [
    {
      "type": "error",
      "pattern": "NetworkError: Failed to fetch /api/users",
      "occurrences": 45,
      "affected_reports": 12,
      "first_seen": "2024-01-15T08:00:00Z",
      "last_seen": "2024-01-20T16:30:00Z",
      "trend": "increasing",
      "correlation": {
        "time_based": "Peaks during 9-10 AM",
        "user_agent": "Primarily affects Safari users",
        "network": "Correlates with API timeouts"
      }
    },
    {
      "type": "performance",
      "pattern": "High LCP on product pages",
      "occurrences": 78,
      "affected_reports": 23,
      "common_factors": {
        "urls": ["/products/*"],
        "user_agents": ["Mobile Safari", "Chrome Android"],
        "network_speed": "3G/4G connections"
      }
    }
  ],
  "summary": {
    "total_patterns": 15,
    "critical_patterns": 3,
    "improving_patterns": 2,
    "worsening_patterns": 5
  }
}
```

## Error Responses

All endpoints follow consistent error structure:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {},
  "request_id": "req-123456"
}
```

Common error codes:
- `UNAUTHORIZED`: Missing or invalid authentication
- `PROJECT_NOT_FOUND`: Project doesn't exist or no access
- `REPORT_NOT_FOUND`: Report doesn't exist
- `INVALID_PARAMETERS`: Query parameter validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error