# FeeDLooP API Documentation

## Overview

This directory contains comprehensive API documentation for the FeeDLooP feedback collection service.

## Documentation Files

### 📋 OpenAPI Specification
- **File**: `api-specification.yaml`
- **Format**: OpenAPI 3.0.3
- **Description**: Complete API specification with all endpoints, schemas, and examples

### 📖 Framework Integration Guide
- **File**: `FRAMEWORK_INTEGRATION.md`
- **Description**: Widget integration guides for React, Vue, Angular, Svelte, and vanilla JavaScript

### 📑 Comprehensive API Guide
- **File**: `../product_documentation/API_DOCUMENTATION.md`
- **Description**: Detailed API documentation with examples and implementation status

## Viewing the API Documentation

### Option 1: Swagger UI (Recommended)

You can view the interactive API documentation using any OpenAPI viewer:

1. **Online Swagger Editor**: https://editor.swagger.io/
   - Copy the contents of `api-specification.yaml`
   - Paste into the editor for interactive exploration

2. **Local Swagger UI** (if available):
   ```bash
   # Install swagger-ui-serve globally
   npm install -g swagger-ui-serve

   # Serve the documentation
   swagger-ui-serve docs/api-specification.yaml
   ```

3. **VS Code Extensions**:
   - Install "OpenAPI (Swagger) Editor" extension
   - Open `api-specification.yaml` file
   - Right-click → "Preview Swagger"

### Option 2: Documentation Website

For a more comprehensive view, see the detailed API documentation at:
`product_documentation/API_DOCUMENTATION.md`

## API Specification Features

The OpenAPI specification includes:

### 🔐 Authentication
- NextAuth.js session-based authentication
- JWT token validation
- Public widget endpoints

### 📊 Core Endpoints
- **Projects**: Create, manage, and export project data
- **Reports**: Submit, view, and manage feedback reports
- **Team Management**: Invite users and manage permissions
- **File Uploads**: Handle attachments with validation
- **Widget API**: Public feedback submission endpoint

### 🛡️ Security Features
- Input validation with detailed schemas
- File type and size restrictions
- Rate limiting specifications
- CORS policies for different endpoint types

### 📝 Request/Response Examples
- Complete request/response examples for all endpoints
- Error response formats with detailed error codes
- Pagination and filtering examples

### 🔧 Technical Details
- Comprehensive data models with Zod schema validation
- Database field mappings and constraints
- File upload specifications (multipart and base64)
- Widget integration parameters

## Quick Start

### 1. Authentication
```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!","name":"John Doe"}'
```

### 2. Create a Project
```bash
# Create project (requires authentication)
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"name":"My Project"}'
```

### 3. Widget Integration
```html
<!-- Add to your website -->
<script
  src="/widget/feedloop-widget.js"
  data-project-key="your-project-key">
</script>
```

### 4. Submit Feedback (Widget)
```bash
# Public endpoint - no authentication required
curl -X POST http://localhost:3000/api/widget/submit \
  -F "project_key=your-project-key" \
  -F "type=bug" \
  -F "title=Issue Title" \
  -F "description=Issue description"
```

## Development Server

The API is available on the development server at:
- **Base URL**: `http://localhost:3000/api` or `http://localhost:3001/api`
- **Widget Demo**: `http://localhost:3000/widget-demo.html`
- **Health Check**: `http://localhost:3000/api/health`

## Testing

### Demo Credentials
- **Demo Project Key**: `flp_demo12345678901234`
- **Widget Test Page**: Available in the development environment

### API Testing Tools
- **Postman**: Import the OpenAPI spec for complete collection
- **Insomnia**: Supports OpenAPI 3.0 import
- **curl**: Examples provided in each endpoint documentation

## Support

For additional information:
- **Technical Issues**: See implementation status in `API_DOCUMENTATION.md`
- **Widget Integration**: Detailed guides in `FRAMEWORK_INTEGRATION.md`
- **Database Schema**: Available in `product_documentation/DATABASE_DOCUMENTATION.sql`
- **Authentication**: Details in `product_documentation/AUTHENTICATION_&_STATE_MANAGEMENT.md`

## Version Information

- **API Version**: 1.0.0
- **OpenAPI Version**: 3.0.3
- **Last Updated**: December 2024
- **Framework**: Next.js 15.5.3 with App Router
- **Authentication**: NextAuth.js v5