# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FeeDLooP_v1 is a feedback collection service for software development companies. It allows clients and testers to report bugs, initiatives, and feedback on dev, QA, and staging environments through an embeddable widget script.

### Core Features
- Project management portal with authentication
- Embeddable JavaScript widget for feedback collection
- Bug reports with automatic diagnostic data capture
- Image attachments (up to 5 images)
- Rich text editing for initiatives and feedback
- Team collaboration with role-based access
- Export functionality (CSV format for Jira/Azure DevOps)

## Technology Stack

### Core Framework
- **Next.js** - Full-stack React framework with App Router
  - API Routes for backend endpoints
  - Server-side rendering and static generation
  - File-system based routing
  - Built-in optimization and performance features

### Frontend
- **React** - UI library for building user interfaces
  - Functional components with hooks (useState, useEffect)
  - Component-based architecture
  - State management and lifecycle methods

- **TypeScript** - Static type checking for JavaScript
  - Interface definitions for type safety
  - Enhanced developer experience with IntelliSense
  - Compile-time error detection

- **Tailwind CSS** - Utility-first CSS framework
  - Responsive design with breakpoint prefixes
  - Component styling with utility classes
  - Custom configuration and theming

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

## Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Docker (for local Supabase and MinIO)
- Git

### Installation Commands
```bash
# Initialize Next.js project
npx create-next-app@latest feedloop-v1 --typescript --tailwind --app

# Install core dependencies
npm install @supabase/supabase-js next-auth react-hook-form zod

# Install MinIO client
npm install minio

# Development server
npm run dev
```

### Environment Variables
```bash
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# MinIO
MINIO_ENDPOINT=your-minio-endpoint
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
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
/lib               # Utility functions and configurations
/types             # TypeScript type definitions
/public            # Static assets
```

### Database Tables (with fl_ prefix)
- **fl_users** - User accounts and authentication
- **fl_projects** - Project containers with integration keys
- **fl_project_invitations** - User access and role management
- **fl_reports** - Feedback submissions with metadata
- **fl_attachments** - File uploads associated with reports

### Key Components
1. **Portal Dashboard** - Project management interface
2. **Feedback Widget** - Embeddable client-side script
3. **Authentication System** - User management and sessions
4. **Database Layer** - Supabase integration with RLS
5. **File Storage** - MinIO integration for attachments
6. **Export System** - CSV generation for external tools

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

## Notes

### Best Practices
1. Use TypeScript interfaces for all data structures
2. Implement proper error handling with Zod validation
3. Follow Next.js App Router conventions
4. Use Tailwind CSS utility classes for styling
5. Implement proper authentication guards for protected routes
6. Use React Hook Form for all form handling
7. Follow Supabase RLS policies for data security

### Security Considerations
- Implement proper CORS policies for widget embedding
- Validate all inputs with Zod schemas
- Use Supabase RLS for data access control
- Sanitize user-uploaded content
- Implement rate limiting for API endpoints

### Recent Changes
- Added database schema with fl_ prefix for all tables
- Defined API contracts in OpenAPI format
- Created data model with proper relationships and RLS policies
- Established quickstart guide for end-to-end testing