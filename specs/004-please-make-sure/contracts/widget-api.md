# Widget API Contract: Enhanced Data Collection

## POST /api/widget/submit (Enhanced)

### Description
Submit feedback with enhanced diagnostic data including Core Web Vitals, detailed error context, and optional interaction tracking.

### Request

#### Headers
```http
Content-Type: multipart/form-data
X-Widget-Version: 2.0.0
```

#### Body (FormData)
```typescript
{
  // Existing fields
  project_key: string;         // Required: Project integration key
  type: 'bug' | 'initiative' | 'feedback';
  title: string;               // Required: 3-200 characters
  description: string;         // Required: HTML content
  priority?: 'low' | 'medium' | 'high' | 'critical';
  reporter_name?: string;
  reporter_email?: string;
  url: string;
  user_agent: string;

  // Enhanced fields (backward compatible)
  console_logs: string;        // JSON string with enhanced structure
  network_requests: string;    // JSON string with timing data
  performance_metrics?: string; // JSON string with Web Vitals
  interaction_data?: string;    // JSON string (if consent given)
  error_context?: string;       // JSON string with error details

  // File attachments
  attachment_0?: File;
  attachment_1?: File;
  // ... up to attachment_4
}
```

#### Enhanced Console Logs Structure
```json
{
  "entries": [
    {
      "level": "error",
      "message": "Failed to fetch user data",
      "timestamp": "2024-01-20T10:30:00Z",
      "stack": "Error: Failed to fetch...",
      "correlation_id": "net-req-123",
      "pattern_hash": "err-fetch-user",
      "occurrence_count": 3,
      "source": {
        "file": "app.js",
        "line": 142,
        "column": 15
      }
    }
  ],
  "performance_metrics": {
    "web_vitals": {
      "fcp": 1200,
      "lcp": 2400,
      "cls": 0.05,
      "fid": 50,
      "tti": 3500
    }
  },
  "metadata": {
    "total_count": 150,
    "error_count": 5,
    "warning_count": 12,
    "truncated": false
  }
}
```

#### Enhanced Network Requests Structure
```json
{
  "entries": [
    {
      "id": "net-req-123",
      "url": "https://api.example.com/users",
      "method": "GET",
      "status": 500,
      "type": "xhr",
      "duration": 1234,
      "timestamp": "2024-01-20T10:29:58Z",
      "size": {
        "request": 256,
        "response": 1024,
        "total": 1280
      },
      "timing": {
        "dns": 20,
        "tcp": 30,
        "ssl": 40,
        "request": 100,
        "response": 1044,
        "total": 1234
      },
      "priority": "high",
      "correlation_id": "err-fetch-user",
      "cache_status": "miss"
    }
  ],
  "metadata": {
    "total_requests": 45,
    "failed_requests": 2,
    "total_duration": 15234,
    "total_size": 524288
  }
}
```

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "report_id": "550e8400-e29b-41d4-a716-446655440000",
  "attachments_uploaded": 2,
  "total_attachments": 2,
  "diagnostic_data": {
    "console_logs_captured": 150,
    "network_requests_captured": 45,
    "performance_metrics_captured": true,
    "interaction_tracking_enabled": false,
    "error_context_captured": true
  }
}
```

#### Validation Error (400 Bad Request)
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "title": "Title must be between 3 and 200 characters",
    "performance_metrics": "Invalid JSON structure"
  }
}
```

#### Project Not Found (404 Not Found)
```json
{
  "success": false,
  "error": "PROJECT_NOT_FOUND",
  "message": "Invalid project key"
}
```

#### Payload Too Large (413 Request Entity Too Large)
```json
{
  "success": false,
  "error": "PAYLOAD_TOO_LARGE",
  "message": "Total payload exceeds 10MB limit",
  "details": {
    "payload_size": 12582912,
    "max_size": 10485760
  }
}
```

### Compression Support

The widget automatically compresses large diagnostic data:

```typescript
// Request header when compressed
X-Content-Encoding: gzip

// Compressed fields in body
console_logs: string;        // Base64 encoded GZIP if > 50KB
network_requests: string;    // Base64 encoded GZIP if > 50KB
```

### Privacy & Consent

#### Consent Check Endpoint
**GET /api/widget/consent-status**

Query Parameters:
- `project_key`: string (required)
- `session_id`: string (optional)

Response:
```json
{
  "interaction_tracking_required": true,
  "consent_given": false,
  "consent_text": "This site collects diagnostic data to improve user experience",
  "privacy_policy_url": "https://example.com/privacy"
}
```

#### Update Consent
**POST /api/widget/consent**

Body:
```json
{
  "project_key": "string",
  "consent_given": true,
  "session_id": "string"
}
```

Response:
```json
{
  "success": true,
  "consent_recorded": true,
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per project
- Burst allowance: 10 requests

Response headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705750800
```

### Backward Compatibility

The API maintains full backward compatibility:

1. All new fields are optional
2. Old widget versions continue to work
3. Missing enhanced data handled gracefully
4. Version detection via `X-Widget-Version` header

### Error Handling

All errors follow consistent structure:
```typescript
interface ErrorResponse {
  success: false;
  error: string;        // Error code (SCREAMING_SNAKE_CASE)
  message: string;      // Human-readable message
  details?: any;        // Additional error context
  request_id?: string;  // For debugging
}
```

### Validation Rules

#### Performance Metrics
- All timing values must be positive numbers
- CLS score between 0 and 1
- Memory values in bytes
- Timestamps in ISO 8601 format

#### Interaction Data
- Consent must be explicitly given
- No PII allowed in event data
- Maximum 1000 events per submission
- Events older than 30 minutes rejected

#### Error Context
- Stack traces sanitized for security
- Maximum 100 unique errors
- Patterns require minimum 2 occurrences