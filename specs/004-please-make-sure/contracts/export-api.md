# Export API Contract: Enhanced Export Formats

## POST /api/projects/{projectId}/reports/export

### Description
Export reports with diagnostic data in various formats for external analysis.

### Request

#### Path Parameters
- `projectId`: string (UUID) - Required

#### Headers
```http
Content-Type: application/json
Accept: application/json | text/csv | application/x-ndjson
```

#### Body
```typescript
{
  // Report selection
  report_ids?: string[];        // Specific reports, or all if empty

  // Filters (if report_ids not provided)
  filters?: {
    type?: ('bug' | 'initiative' | 'feedback')[];
    priority?: ('low' | 'medium' | 'high' | 'critical')[];
    date_range?: {
      from: string;            // ISO 8601
      to: string;              // ISO 8601
    };
    performance?: ('critical' | 'high' | 'medium' | 'low')[];
    has_errors?: boolean;
  };

  // Export format
  format: 'csv' | 'json' | 'ndjson' | 'excel';

  // Field selection
  fields?: {
    basic: boolean;            // id, title, type, priority, created_at
    description: boolean;      // Full description HTML
    reporter: boolean;         // reporter_name, reporter_email
    url_info: boolean;         // url, user_agent

    // Enhanced fields
    console_logs?: {
      include: boolean;
      max_entries?: number;    // Limit entries per report
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

    insights?: boolean;        // AI-generated insights
    correlations?: boolean;    // Error-network correlations
  };

  // Export options
  options?: {
    compress?: boolean;        // GZIP compression
    include_headers?: boolean; // Column headers for CSV
    date_format?: string;      // ISO8601, Unix, or custom
    flatten_json?: boolean;    // Flatten nested JSON for CSV
    max_rows?: number;         // Limit total rows
  };
}
```

### Response

#### Success - JSON Format (200 OK)
```json
{
  "success": true,
  "export": {
    "format": "json",
    "report_count": 45,
    "generated_at": "2024-01-20T10:30:00Z",
    "filters_applied": {
      "type": ["bug"],
      "performance": ["high", "critical"]
    },
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Checkout page crashes",
        "type": "bug",
        "priority": "high",
        "created_at": "2024-01-20T10:30:00Z",
        "url": "https://example.com/checkout",
        "performance_metrics": {
          "web_vitals": {
            "lcp": 3500,
            "fcp": 1200,
            "cls": 0.15
          },
          "category": "high"
        },
        "error_summary": {
          "total_errors": 5,
          "patterns": ["NetworkError", "TypeError"]
        },
        "network_summary": {
          "total_requests": 45,
          "failed_requests": 2,
          "total_duration": 15234
        }
      }
    ]
  }
}
```

#### Success - CSV Format (200 OK)
```csv
id,title,type,priority,created_at,lcp,fcp,cls,error_count,failed_requests
550e8400-e29b-41d4-a716-446655440000,"Checkout page crashes",bug,high,2024-01-20T10:30:00Z,3500,1200,0.15,5,2
660e8400-e29b-41d4-a716-446655440001,"Login timeout",bug,medium,2024-01-20T09:15:00Z,2100,800,0.02,1,1
```

Headers:
```http
Content-Type: text/csv
Content-Disposition: attachment; filename="reports-export-20240120.csv"
```

#### Success - NDJSON Format (200 OK)
```ndjson
{"id":"550e8400-e29b-41d4-a716-446655440000","title":"Checkout page crashes","type":"bug"...}
{"id":"660e8400-e29b-41d4-a716-446655440001","title":"Login timeout","type":"bug"...}
```

Headers:
```http
Content-Type: application/x-ndjson
Content-Disposition: attachment; filename="reports-export-20240120.ndjson"
```

#### Success - Excel Format (200 OK)
Binary Excel file (.xlsx) with multiple sheets:
- **Reports**: Main report data
- **Console Logs**: Detailed logs (if included)
- **Network Requests**: Request details (if included)
- **Performance**: Web Vitals and metrics (if included)
- **Insights**: Generated insights (if included)

Headers:
```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="reports-export-20240120.xlsx"
```

## GET /api/projects/{projectId}/reports/export/{exportId}

### Description
Retrieve a previously generated export (for large exports).

### Request

#### Path Parameters
- `projectId`: string (UUID) - Required
- `exportId`: string (UUID) - Required

### Response

#### Success (200 OK)
Returns the exported file with appropriate Content-Type.

#### Export Not Ready (202 Accepted)
```json
{
  "success": true,
  "export_id": "770e8400-e29b-41d4-a716-446655440003",
  "status": "processing",
  "progress": 65,
  "estimated_completion": "2024-01-20T10:35:00Z"
}
```

## POST /api/projects/{projectId}/reports/export/templates

### Description
Create a reusable export template.

### Request

#### Body
```typescript
{
  name: string;                 // Template name
  description?: string;         // Template description

  // Same structure as export request
  filters: {...},
  format: string,
  fields: {...},
  options: {...}
}
```

### Response

#### Success (201 Created)
```json
{
  "success": true,
  "template": {
    "id": "880e8400-e29b-41d4-a716-446655440004",
    "name": "Weekly Bug Report",
    "description": "Export all high priority bugs from the past week",
    "created_at": "2024-01-20T10:30:00Z",
    "created_by": "user@example.com"
  }
}
```

## GET /api/projects/{projectId}/reports/export/templates

### Description
List available export templates.

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "templates": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440004",
      "name": "Weekly Bug Report",
      "description": "Export all high priority bugs from the past week",
      "format": "excel",
      "created_at": "2024-01-20T10:30:00Z",
      "last_used": "2024-01-19T09:00:00Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440005",
      "name": "Performance Analysis",
      "description": "Export reports with poor performance metrics",
      "format": "json",
      "created_at": "2024-01-15T14:00:00Z",
      "last_used": "2024-01-20T08:00:00Z"
    }
  ]
}
```

## POST /api/projects/{projectId}/reports/export/schedule

### Description
Schedule recurring exports.

### Request

#### Body
```typescript
{
  template_id: string;          // Export template to use
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;               // HH:MM in UTC
    day_of_week?: number;       // 0-6 for weekly
    day_of_month?: number;      // 1-31 for monthly
  };
  delivery: {
    method: 'email' | 'webhook' | 'storage';
    email_recipients?: string[];
    webhook_url?: string;
    storage_path?: string;
  };
  enabled: boolean;
}
```

### Response

#### Success (201 Created)
```json
{
  "success": true,
  "schedule": {
    "id": "aa0e8400-e29b-41d4-a716-446655440006",
    "template_id": "880e8400-e29b-41d4-a716-446655440004",
    "frequency": "weekly",
    "next_run": "2024-01-27T09:00:00Z",
    "enabled": true
  }
}
```

## Export Format Details

### CSV Flattening Rules
For nested JSON data in CSV exports:

1. **Console Logs**: Summarized as `error_count`, `warning_count`, `info_count`
2. **Network Requests**: Summarized as `total_requests`, `failed_requests`, `avg_duration`
3. **Web Vitals**: Each metric as separate column (`lcp`, `fcp`, `cls`, `fid`, `tti`)
4. **Patterns**: Comma-separated list of pattern names

### JSON Structure Options

#### Flat Structure (flatten_json: true)
```json
{
  "report_id": "...",
  "report_title": "...",
  "performance_lcp": 3500,
  "performance_fcp": 1200,
  "console_error_count": 5
}
```

#### Nested Structure (flatten_json: false)
```json
{
  "report": {
    "id": "...",
    "title": "..."
  },
  "performance": {
    "web_vitals": {
      "lcp": 3500,
      "fcp": 1200
    }
  },
  "console": {
    "error_count": 5
  }
}
```

### Compression
When `compress: true`:
- Response includes `Content-Encoding: gzip`
- File size reduced by ~60-80%
- Automatic decompression in most tools

## Rate Limits

- Standard exports: 10 per minute
- Large exports (>1000 reports): 1 per minute
- Scheduled exports: Max 10 active schedules

## Error Responses

```json
{
  "success": false,
  "error": "EXPORT_TOO_LARGE",
  "message": "Export exceeds maximum size of 100MB",
  "details": {
    "report_count": 5000,
    "estimated_size": 125000000
  }
}
```

Common error codes:
- `EXPORT_TOO_LARGE`: Export exceeds size limits
- `INVALID_FORMAT`: Requested format not supported
- `TEMPLATE_NOT_FOUND`: Template ID doesn't exist
- `SCHEDULE_LIMIT_REACHED`: Maximum schedules exceeded