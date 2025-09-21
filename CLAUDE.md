# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FeeDLooP_v1 is a feedback collection service for software development companies. It allows clients and testers to report bugs, initiatives, and feedback on dev, QA, and staging environments through an embeddable widget script.

### Core Features
- Project management portal with authentication
- Embeddable JavaScript widget for feedback collection
- Bug reports with automatic diagnostic data capture (console logs, network requests)
- Image attachments (up to 5 images)
- Rich text editing for initiatives and feedback
- Team collaboration with role-based access
- Export functionality (CSV format for Jira/Azure DevOps)
- Enhanced reports dashboard with advanced filtering and terminal-style log viewer

## Technology Stack

### Core Framework
- **Next.js 15.5.3** - Full-stack React framework with App Router
  - API Routes for backend endpoints
  - Server-side rendering and static generation
  - File-system based routing
  - Built-in optimization and performance features

### Frontend
- **React 18+** - UI library for building user interfaces
  - Functional components with hooks (useState, useEffect)
  - Component-based architecture
  - State management and lifecycle methods

- **TypeScript 5.0+** - Static type checking for JavaScript
  - Interface definitions for type safety
  - Enhanced developer experience with IntelliSense
  - Compile-time error detection

- **Tailwind CSS** - Utility-first CSS framework
  - Responsive design with breakpoint prefixes
  - Component styling with utility classes
  - Custom configuration and theming

### Syntax Highlighting
- **Prism.js** - Lightweight syntax highlighting library
  - JSON and JavaScript syntax highlighting
  - Used in console log viewer for better readability
  - Terminal-style log display with color coding
  - Enhanced developer experience in report details

### Authentication & Database
- **NextAuth.js (Auth.js)** - Authentication solution for Next.js
  - Provider configuration for various auth methods
  - Session management with cookies/JWT
  - Server-side and client-side auth utilities

- **Supabase** - PostgreSQL database and backend services
  - Real-time subscriptions
  - Row Level Security (RLS) policies
  - Auto-generated APIs
  - Self-hosted deployment option

### File Storage
- **MinIO** - S3-compatible object storage
  - Self-hosted file storage solution
  - Bucket management and policies
  - Integration with JavaScript client SDK
  - Image upload and management

### Form Handling & Validation
- **React Hook Form** - Performant form library
  - useForm hook for form state management
  - Input registration with validation rules
  - Error handling and display

- **Zod** - TypeScript-first schema validation
  - Runtime type checking and validation
  - Schema definition with static type inference
  - Integration with form libraries

### Deployment
- **Coolify** - Self-hosted deployment platform on VPS
  - Container orchestration
  - Environment management
  - SSL certificate handling

## Recent Changes

### Enhanced Reports Dashboard (Feature 002)
- **Advanced Data Table**: Implemented filtering, sorting, and improved UI for reports listing
- **Terminal-Style Log Viewer**: Console logs display with syntax highlighting and copy functionality
- **CSV Export with Selection**: Bulk export capability with customizable field selection
- **Hover Tooltips**: Report descriptions shown on title hover
- **Performance Optimizations**: Client-side filtering for <100ms response times

## Development Commands

### Testing
```bash
npm run test        # Run unit tests
npm run test:e2e    # Run end-to-end tests
```

### Code Quality
```bash
npm run lint        # ESLint code checking
npm run type-check  # TypeScript compilation check
```

### Build & Deploy
```bash
npm run build       # Production build
npm run start       # Start production server
```

## Architecture

### Project Structure
```
/app                 # Next.js App Router
  /api              # API routes
  /auth             # Authentication pages
  /dashboard        # Project dashboard
  /widget           # Embeddable widget
/components         # Reusable React components
  /reports          # Enhanced reports components
/hooks              # Custom React hooks
/lib               # Utility functions and configurations
/types             # TypeScript type definitions
/public            # Static assets
/tests             # Test files
```

### Database Tables (with fl_ prefix)
- **fl_users** - User accounts and authentication
- **fl_projects** - Project containers with integration keys
- **fl_project_invitations** - User access and role management
- **fl_reports** - Feedback submissions with metadata and diagnostic data
- **fl_attachments** - File uploads associated with reports

### Key Components
1. **Portal Dashboard** - Project management interface
2. **Enhanced Reports Table** - Advanced filtering and export functionality
3. **Feedback Widget** - Embeddable client-side script with diagnostic capture
4. **Authentication System** - User management and sessions
5. **Database Layer** - Supabase integration with RLS
6. **File Storage** - MinIO integration for attachments
7. **Export System** - CSV generation for external tools

## Best Practices

1. Use TypeScript interfaces for all data structures
2. Implement proper error handling with Zod validation
3. Follow Next.js App Router conventions
4. Use Tailwind CSS utility classes for styling
5. Implement proper authentication guards for protected routes
6. Use React Hook Form for all form handling
7. Follow Supabase RLS policies for data security
8. Apply syntax highlighting for code display with Prism.js

## Security Considerations
- Implement proper CORS policies for widget embedding
- Validate all inputs with Zod schemas
- Use Supabase RLS for data access control
- Sanitize user-uploaded content
- Implement rate limiting for API endpoints