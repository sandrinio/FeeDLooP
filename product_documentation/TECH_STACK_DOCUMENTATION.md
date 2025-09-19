# 📚 FeeDLooP MVP - Complete Tech Stack Documentation

## Table of Contents
1. [Core Technologies](#core-technologies)
2. [Frontend Framework - Next.js](#frontend-framework---nextjs)
3. [UI Library - React](#ui-library---react)
4. [Database & Backend - Supabase](#database--backend---supabase)
5. [Authentication - NextAuth.js](#authentication---nextauthjs)
6. [Form Management - React Hook Form](#form-management---react-hook-form)
7. [Validation - Zod](#validation---zod)
8. [Styling - Tailwind CSS](#styling---tailwind-css)
9. [File Storage - MinIO](#file-storage---minio)
10. [Additional Technologies](#additional-technologies)

---

## Core Technologies

### Technology Overview
| Technology | Version | Purpose | Documentation |
|------------|---------|---------|---------------|
| Next.js | 15.5.3 | Full-stack React framework | [Next.js Docs](https://nextjs.org/docs) |
| React | 19.1.0 | UI Library | [React Docs](https://react.dev) |
| TypeScript | 5.x | Type-safe JavaScript | [TypeScript Docs](https://www.typescriptlang.org/docs/) |
| Supabase | Latest | Backend as a Service | [Supabase Docs](https://supabase.com/docs) |
| NextAuth.js | 5.0.0-beta | Authentication | [Auth.js Docs](https://authjs.dev) |
| Tailwind CSS | 4.x | Utility-first CSS | [Tailwind Docs](https://tailwindcss.com/docs) |
| MinIO | 8.0.6 | S3-compatible storage | [MinIO Docs](https://min.io/docs/) |
| React Hook Form | 7.62.0 | Form management | [RHF Docs](https://react-hook-form.com) |
| Zod | 4.1.9 | Schema validation | [Zod Docs](https://zod.dev) |

---

## Frontend Framework - Next.js

### Overview
Next.js 15.5.3 with App Router provides the foundation for our full-stack application, offering server-side rendering, API routes, and optimized performance.

### Key Features Used
- **App Router** - Modern routing with server components
- **API Routes** - Backend endpoints within the same codebase
- **Server Components** - Reduced client bundle size
- **Server Actions** - Direct database mutations
- **Image Optimization** - Automatic image optimization
- **Middleware** - Authentication and request handling

### Code Examples

#### Server Component with Data Fetching
```typescript
// app/dashboard/projects/page.tsx
export default async function ProjectsPage() {
  // Direct data fetching in Server Component
  const projects = await getProjects()

  return (
    <div>
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}

async function getProjects() {
  const res = await fetch('https://sulabase.soula.ge/api/projects', {
    cache: 'no-store', // Dynamic data fetching
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  })
  return res.json()
}
```

#### API Route Handler
```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Handle GET requests
  const projects = await db.select().from('fl_projects')
  return NextResponse.json(projects)
}

export async function POST(request: NextRequest) {
  // Handle POST requests
  const body = await request.json()
  const project = await db.insert('fl_projects').values(body)
  return NextResponse.json(project, { status: 201 })
}
```

#### Dynamic Routes with Params
```typescript
// app/dashboard/projects/[projectId]/page.tsx
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const project = await getProject(projectId)

  return <ProjectDetail project={project} />
}
```

#### Client Component with Hooks
```typescript
// components/dashboard/Navigation.tsx
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <nav>
      <button onClick={() => router.push('/dashboard')}>
        Dashboard
      </button>
    </nav>
  )
}
```

---

## UI Library - React

### Overview
React 19.1.0 provides the component-based architecture for building our user interface with hooks and modern patterns.

### Core Concepts Used
- **Functional Components** - All components are functions
- **Hooks** - State and lifecycle management
- **Context API** - Global state management
- **Suspense** - Loading states and code splitting
- **Error Boundaries** - Error handling

### Code Examples

#### Component with State and Effects
```typescript
// components/reports/ReportForm.tsx
import { useState, useEffect } from 'react'

function ReportForm({ projectId }: { projectId: string }) {
  const [state, setState] = useState<ReportState>({
    type: 'bug',
    title: '',
    description: ''
  })

  useEffect(() => {
    // Capture browser diagnostics for bug reports
    if (state.type === 'bug') {
      captureDiagnostics()
    }
  }, [state.type])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await submitReport(state)
  }

  return (
    <form onSubmit={handleSubmit}>
      <select
        value={state.type}
        onChange={(e) => setState({...state, type: e.target.value})}
      >
        <option value="bug">Bug</option>
        <option value="initiative">Initiative</option>
        <option value="feedback">Feedback</option>
      </select>
      {/* Form fields */}
    </form>
  )
}
```

#### Context Provider Pattern
```typescript
// contexts/ProjectContext.tsx
import { createContext, useContext, ReactNode } from 'react'

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null)

  return (
    <ProjectContext.Provider value={{ project, setProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
```

---

## Database & Backend - Supabase

### Overview
Supabase provides PostgreSQL database, real-time subscriptions, authentication, and storage with Row Level Security (RLS).

### Key Features
- **PostgreSQL Database** - Relational data with full SQL support
- **Row Level Security** - Fine-grained access control
- **Real-time Subscriptions** - Live data updates
- **Auto-generated APIs** - REST and GraphQL endpoints
- **Storage** - File and media storage

### Code Examples

#### Database Connection Setup
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// For server-side with service role
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

#### Row Level Security Policies
```sql
-- Users can only access projects they're invited to
CREATE POLICY project_access ON fl_projects
FOR ALL TO authenticated
USING (
  id IN (
    SELECT project_id FROM fl_project_invitations
    WHERE user_id = auth.uid()
  )
);

-- Users can only access reports from their projects
CREATE POLICY report_access ON fl_reports
FOR ALL TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM fl_project_invitations
    WHERE user_id = auth.uid()
  )
);
```

#### Real-time Subscriptions
```typescript
// lib/supabase/realtime.ts
import { useEffect } from 'react'
import { supabase } from './client'

export function useRealtimeReports(projectId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`reports:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fl_reports',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Change received!', payload)
          // Update local state
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])
}
```

#### Database Queries
```typescript
// lib/services/projectService.ts
export async function getProjectReports(projectId: string) {
  const { data, error } = await supabase
    .from('fl_reports')
    .select(`
      *,
      attachments:fl_attachments(*)
    `)
    .eq('project_id', projectId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data
}
```

---

## Authentication - NextAuth.js

### Overview
NextAuth.js 5.0.0-beta provides complete authentication solution with session management, JWT tokens, and multiple provider support.

### Configuration
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { supabaseAdmin } from '@/lib/supabase/client'
import bcrypt from 'bcryptjs'

export const authOptions = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Verify user in database
        const { data: user } = await supabaseAdmin
          .from('fl_users')
          .select('*')
          .eq('email', credentials.email)
          .single()

        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password_hash
        )

        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt'
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

#### Protected Routes Middleware
```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/auth/login'
  }
})

export const config = {
  matcher: ['/dashboard/:path*', '/api/projects/:path*']
}
```

#### Session Usage in Components
```typescript
// app/dashboard/layout.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div>
      <nav>Welcome, {session.user.email}</nav>
      {children}
    </div>
  )
}
```

---

## Form Management - React Hook Form

### Overview
React Hook Form 7.62.0 provides performant form handling with minimal re-renders and built-in validation.

### Code Examples

#### Basic Form Setup
```typescript
// components/projects/CreateProjectForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional()
})

type ProjectFormData = z.infer<typeof projectSchema>

export function CreateProjectForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema)
  })

  const onSubmit = async (data: ProjectFormData) => {
    await createProject(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('name')}
        placeholder="Project Name"
      />
      {errors.name && (
        <span className="text-red-500">{errors.name.message}</span>
      )}

      <textarea
        {...register('description')}
        placeholder="Description"
      />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  )
}
```

#### Complex Form with File Upload
```typescript
// components/reports/ReportSubmissionForm.tsx
import { useForm, Controller } from 'react-hook-form'
import { useState } from 'react'

export function ReportSubmissionForm({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<File[]>([])
  const { control, handleSubmit, watch } = useForm({
    defaultValues: {
      type: 'bug',
      title: '',
      description: '',
      priority: 'medium'
    }
  })

  const reportType = watch('type')

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <select {...field}>
            <option value="bug">Bug</option>
            <option value="initiative">Initiative</option>
            <option value="feedback">Feedback</option>
          </select>
        )}
      />

      {reportType === 'bug' && (
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <select {...field}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          )}
        />
      )}

      <input
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx"
        onChange={(e) => {
          const newFiles = Array.from(e.target.files || [])
          if (files.length + newFiles.length <= 5) {
            setFiles([...files, ...newFiles])
          }
        }}
      />
    </form>
  )
}
```

---

## Validation - Zod

### Overview
Zod 4.1.9 provides TypeScript-first schema validation with static type inference.

### Schema Definitions
```typescript
// lib/validations/schemas.ts
import { z } from 'zod'

// User schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().max(100).nullable(),
  created_at: z.date(),
  updated_at: z.date()
})

// Report schemas
export const reportCreateSchema = z.object({
  type: z.enum(['bug', 'initiative', 'feedback']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  reporter_email: z.string().email().optional(),
  reporter_name: z.string().max(100).optional(),
  url: z.string().url().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    size: z.number().max(10 * 1024 * 1024), // 10MB
    type: z.string()
  })).max(5).optional()
})

// Project schemas
export const projectCreateSchema = z.object({
  name: z.string().min(1).max(100)
})

export const projectInvitationSchema = z.object({
  email: z.string().email(),
  can_invite: z.boolean().default(false)
})

// Type inference
export type User = z.infer<typeof userSchema>
export type ReportCreateInput = z.infer<typeof reportCreateSchema>
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>
```

#### API Validation Middleware
```typescript
// lib/middleware/validation.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validated = schema.parse(body)
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400 }
        )
      }
      throw error
    }
  }
}

// Usage in API route
export async function POST(request: NextRequest) {
  const validation = await validateRequest(reportCreateSchema)(request)
  if (!validation.success) return validation

  // Process validated data
  const report = await createReport(validation.data)
  return NextResponse.json(report)
}
```

---

## Styling - Tailwind CSS

### Overview
Tailwind CSS 4.x provides utility-first styling with excellent responsive design capabilities.

### Component Examples

#### Responsive Dashboard Layout
```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform -translate-x-full transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0">
        <nav className="mt-5 px-2">
          <a href="/dashboard" className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            Dashboard
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
```

#### Custom Component Classes
```tsx
// components/ui/Button.tsx
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

---

## File Storage - MinIO

### Overview
MinIO 8.0.6 provides S3-compatible object storage for file attachments.

### Configuration
```typescript
// lib/storage/minio.ts
import * as Minio from 'minio'

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: 9000,
  useSSL: process.env.NODE_ENV === 'production',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!
})

// Initialize bucket
export async function initializeBucket() {
  const bucketName = process.env.MINIO_BUCKET_NAME!

  const exists = await minioClient.bucketExists(bucketName)
  if (!exists) {
    await minioClient.makeBucket(bucketName)

    // Set bucket policy for public read
    const policy = {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketName}/*`]
      }]
    }

    await minioClient.setBucketPolicy(
      bucketName,
      JSON.stringify(policy)
    )
  }
}
```

#### File Upload Service
```typescript
// lib/services/fileService.ts
import { minioClient } from '@/lib/storage/minio'
import { v4 as uuidv4 } from 'uuid'

export async function uploadFile(
  file: File,
  reportId: string
): Promise<string> {
  const bucketName = process.env.MINIO_BUCKET_NAME!
  const fileExt = file.name.split('.').pop()
  const fileName = `${reportId}/${uuidv4()}.${fileExt}`

  // Convert File to Buffer
  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload to MinIO
  await minioClient.putObject(
    bucketName,
    fileName,
    buffer,
    file.size,
    {
      'Content-Type': file.type,
      'Report-ID': reportId
    }
  )

  return fileName
}

export async function getFileUrl(fileName: string): Promise<string> {
  const bucketName = process.env.MINIO_BUCKET_NAME!

  // Generate presigned URL (7 days expiry)
  return await minioClient.presignedGetObject(
    bucketName,
    fileName,
    7 * 24 * 60 * 60
  )
}

export async function deleteFile(fileName: string): Promise<void> {
  const bucketName = process.env.MINIO_BUCKET_NAME!
  await minioClient.removeObject(bucketName, fileName)
}
```

---

## Additional Technologies

### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Docker Compose for Development
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  minio:
    image: minio/minio:latest
    container_name: feedloop-minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    networks:
      - feedloop-network

  redis:
    image: redis:7-alpine
    container_name: feedloop-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - feedloop-network

volumes:
  minio_data:
  redis_data:

networks:
  feedloop-network:
    driver: bridge
```

### ESLint Configuration
```javascript
// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

const eslintConfig = [
  ...compat.config({
    extends: ['next', 'next/core-web-vitals'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'off',
    }
  }),
]

export default eslintConfig
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

---

## Widget Architecture

### Standalone JavaScript Widget
```javascript
// public/widget.js
(function() {
  'use strict';

  // Create isolated scope
  const FeedLoopWidget = {
    config: {
      apiUrl: 'https://feedloop.com/api/widget/submit',
      projectKey: null
    },

    init: function(projectKey) {
      this.config.projectKey = projectKey;
      this.createWidget();
      this.attachEventListeners();
    },

    createWidget: function() {
      // Create shadow DOM for CSS isolation
      const host = document.createElement('div');
      host.id = 'feedloop-widget-host';
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });

      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .feedloop-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 99999;
        }
        .feedloop-tab {
          background: #3B82F6;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .feedloop-form {
          display: none;
          position: absolute;
          bottom: 60px;
          right: 0;
          width: 400px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          padding: 20px;
        }
        .feedloop-form.active {
          display: block;
        }
      `;
      shadow.appendChild(style);

      // Add HTML
      const container = document.createElement('div');
      container.className = 'feedloop-widget';
      container.innerHTML = `
        <div class="feedloop-tab">Feedback</div>
        <div class="feedloop-form">
          <h3>Send Feedback</h3>
          <form id="feedloop-form">
            <select name="type">
              <option value="bug">Bug Report</option>
              <option value="initiative">Feature Request</option>
              <option value="feedback">General Feedback</option>
            </select>
            <input type="text" name="title" placeholder="Title" required>
            <textarea name="description" placeholder="Description" required></textarea>
            <button type="submit">Submit</button>
          </form>
        </div>
      `;
      shadow.appendChild(container);
    },

    attachEventListeners: function() {
      const shadow = document.getElementById('feedloop-widget-host').shadowRoot;
      const tab = shadow.querySelector('.feedloop-tab');
      const form = shadow.querySelector('.feedloop-form');

      tab.addEventListener('click', () => {
        form.classList.toggle('active');
      });

      shadow.getElementById('feedloop-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitFeedback(new FormData(e.target));
      });
    },

    submitFeedback: async function(formData) {
      const data = Object.fromEntries(formData);

      // Add diagnostic data for bug reports
      if (data.type === 'bug') {
        data.url = window.location.href;
        data.userAgent = navigator.userAgent;
        data.consoleLogs = this.captureConsoleLogs();
      }

      try {
        const response = await fetch(this.config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Project-Key': this.config.projectKey
          },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          alert('Thank you for your feedback!');
        }
      } catch (error) {
        console.error('Failed to submit feedback:', error);
      }
    },

    captureConsoleLogs: function() {
      // Capture recent console logs
      return window.__feedloopLogs || [];
    }
  };

  // Override console methods to capture logs
  const originalLog = console.log;
  const originalError = console.error;
  window.__feedloopLogs = [];

  console.log = function(...args) {
    window.__feedloopLogs.push({ type: 'log', message: args });
    originalLog.apply(console, args);
  };

  console.error = function(...args) {
    window.__feedloopLogs.push({ type: 'error', message: args });
    originalError.apply(console, args);
  };

  // Initialize widget
  const script = document.currentScript;
  const projectKey = script.getAttribute('data-project-key');
  if (projectKey) {
    FeedLoopWidget.init(projectKey);
  }
})();
```

---

## Development Commands

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "db:setup": "docker-compose -f docker-compose.dev.yml up -d",
    "db:down": "docker-compose -f docker-compose.dev.yml down",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test"
  }
}
```

---

## Security Best Practices

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
MINIO_ENDPOINT=your-minio-endpoint
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
```

### Input Validation
- All user inputs validated with Zod schemas
- SQL injection prevention via Supabase prepared statements
- XSS prevention with React's built-in escaping
- CSRF protection via NextAuth.js

### Authentication & Authorization
- JWT tokens for stateless auth
- Row Level Security for data access
- Session management with NextAuth.js
- Secure password hashing with bcrypt

---

## Performance Optimizations

### Next.js Optimizations
- Server Components for reduced bundle size
- Image optimization with next/image
- Code splitting and lazy loading
- Static generation where possible

### Database Optimizations
- Proper indexing on query columns
- Connection pooling
- Pagination for large datasets
- Optimistic updates for better UX

### Widget Performance
- Bundle size <50KB gzipped
- Async loading
- Shadow DOM for isolation
- Minimal dependencies

---

## Deployment Configuration

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Docker Production Setup
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Conclusion

This comprehensive documentation covers all major technologies and patterns used in the FeeDLooP MVP. Each technology has been carefully selected to provide:

1. **Rapid Development** - Modern frameworks and tools
2. **Type Safety** - TypeScript throughout
3. **Security** - Multiple layers of protection
4. **Performance** - Optimized for speed
5. **Scalability** - Ready for growth
6. **Maintainability** - Clean architecture and patterns

The tech stack provides a solid foundation for building a production-ready feedback collection service with enterprise-grade features.