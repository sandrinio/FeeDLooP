/**
 * Project Data Model with Zod Validation
 * T038: Project data model with Zod validation in lib/models/project.ts
 */

import { z } from 'zod'

// Project Status Enum
export const ProjectStatusSchema = z.enum(['active', 'inactive', 'archived'])
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>

// Project Creation Schema
export const CreateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Project name can only contain letters, numbers, spaces, hyphens, underscores, and periods'),

  description: z.string()
    .min(1, 'Project description is required')
    .max(500, 'Project description must be less than 500 characters'),

  domain: z.string()
    .url('Invalid domain URL')
    .max(255, 'Domain URL must be less than 255 characters')
    .optional(),

  allowed_origins: z.array(z.string().url('Invalid origin URL'))
    .max(10, 'Maximum 10 allowed origins')
    .optional()
    .default([]),

  webhook_url: z.string()
    .url('Invalid webhook URL')
    .max(255, 'Webhook URL must be less than 255 characters')
    .optional()
    .nullable(),

  settings: z.object({
    auto_acknowledge: z.boolean().default(false),
    email_notifications: z.boolean().default(true),
    slack_notifications: z.boolean().default(false),
    jira_integration: z.boolean().default(false),
    rate_limit_per_hour: z.number().int().min(1).max(1000).default(100)
  }).optional().default({
    auto_acknowledge: false,
    email_notifications: true,
    slack_notifications: false,
    jira_integration: false,
    rate_limit_per_hour: 100
  })
})

// Project Update Schema
export const UpdateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Project name can only contain letters, numbers, spaces, hyphens, underscores, and periods')
    .optional(),

  description: z.string()
    .min(1, 'Project description is required')
    .max(500, 'Project description must be less than 500 characters')
    .optional(),

  domain: z.string()
    .url('Invalid domain URL')
    .max(255, 'Domain URL must be less than 255 characters')
    .optional(),

  allowed_origins: z.array(z.string().url('Invalid origin URL'))
    .max(10, 'Maximum 10 allowed origins')
    .optional(),

  webhook_url: z.string()
    .url('Invalid webhook URL')
    .max(255, 'Webhook URL must be less than 255 characters')
    .optional()
    .nullable(),

  status: ProjectStatusSchema.optional(),

  settings: z.object({
    auto_acknowledge: z.boolean().optional(),
    email_notifications: z.boolean().optional(),
    slack_notifications: z.boolean().optional(),
    jira_integration: z.boolean().optional(),
    rate_limit_per_hour: z.number().int().min(1).max(1000).optional()
  }).optional()
})

// Full Project Schema (database representation)
export const ProjectSchema = z.object({
  id: z.string()
    .uuid('Invalid project ID format'),

  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters'),

  description: z.string()
    .min(1, 'Project description is required')
    .max(500, 'Project description must be less than 500 characters'),

  integration_key: z.string()
    .regex(/^flp_[a-zA-Z0-9]{16,32}$/, 'Invalid integration key format'),

  domain: z.string()
    .url('Invalid domain URL')
    .max(255, 'Domain URL must be less than 255 characters')
    .nullable()
    .optional(),

  allowed_origins: z.array(z.string().url())
    .default([]),

  webhook_url: z.string()
    .url('Invalid webhook URL')
    .max(255, 'Webhook URL must be less than 255 characters')
    .nullable()
    .optional(),

  status: ProjectStatusSchema
    .default('active'),

  settings: z.object({
    auto_acknowledge: z.boolean(),
    email_notifications: z.boolean(),
    slack_notifications: z.boolean(),
    jira_integration: z.boolean(),
    rate_limit_per_hour: z.number().int()
  }),

  owner_id: z.string()
    .uuid('Invalid owner ID format'),

  created_at: z.date(),

  updated_at: z.date(),

  last_activity_at: z.date()
    .nullable()
    .optional()
})

// Project with Team Members Schema (includes team data)
export const ProjectWithTeamSchema = ProjectSchema.extend({
  team_members: z.array(z.object({
    user_id: z.string().uuid(),
    email: z.string().email(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.enum(['owner', 'member']),
    joined_at: z.date(),
    avatar_url: z.string().nullable().optional()
  })).default([]),

  report_counts: z.object({
    total: z.number().int().nonnegative(),
    bugs: z.number().int().nonnegative(),
    initiatives: z.number().int().nonnegative(),
    feedback: z.number().int().nonnegative(),
    new: z.number().int().nonnegative(),
    in_progress: z.number().int().nonnegative(),
    resolved: z.number().int().nonnegative()
  }).optional()
})

// Project List Item Schema (for project listings)
export const ProjectListItemSchema = ProjectSchema.pick({
  id: true,
  name: true,
  description: true,
  status: true,
  owner_id: true,
  created_at: true,
  updated_at: true,
  last_activity_at: true
}).extend({
  report_count: z.number().int().nonnegative().default(0),
  team_member_count: z.number().int().nonnegative().default(1),
  user_role: z.enum(['owner', 'member'])
})

// Integration Key Validation Schema
export const IntegrationKeySchema = z.string()
  .regex(/^flp_[a-zA-Z0-9]{16,32}$/, 'Invalid integration key format')

// Type exports
export type CreateProject = z.infer<typeof CreateProjectSchema>
export type UpdateProject = z.infer<typeof UpdateProjectSchema>
export type Project = z.infer<typeof ProjectSchema>
export type ProjectWithTeam = z.infer<typeof ProjectWithTeamSchema>
export type ProjectListItem = z.infer<typeof ProjectListItemSchema>

// Validation functions
export const validateCreateProject = (data: unknown) => CreateProjectSchema.parse(data)
export const validateUpdateProject = (data: unknown) => UpdateProjectSchema.parse(data)
export const validateProject = (data: unknown) => ProjectSchema.parse(data)
export const validateProjectWithTeam = (data: unknown) => ProjectWithTeamSchema.parse(data)
export const validateProjectListItem = (data: unknown) => ProjectListItemSchema.parse(data)
export const validateIntegrationKey = (data: unknown) => IntegrationKeySchema.parse(data)

// Safe validation functions
export const safeValidateCreateProject = (data: unknown) => CreateProjectSchema.safeParse(data)
export const safeValidateUpdateProject = (data: unknown) => UpdateProjectSchema.safeParse(data)
export const safeValidateProject = (data: unknown) => ProjectSchema.safeParse(data)
export const safeValidateProjectWithTeam = (data: unknown) => ProjectWithTeamSchema.safeParse(data)
export const safeValidateProjectListItem = (data: unknown) => ProjectListItemSchema.safeParse(data)
export const safeValidateIntegrationKey = (data: unknown) => IntegrationKeySchema.safeParse(data)

// Helper functions
export const generateIntegrationKey = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const length = 24 // Generate 24 character random string
  let result = 'flp_'

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

export const isProjectOwner = (project: Project | ProjectWithTeam, userId: string): boolean => {
  return project.owner_id === userId
}

export const isProjectMember = (project: ProjectWithTeam, userId: string): boolean => {
  return project.team_members.some(member => member.user_id === userId)
}

export const hasProjectAccess = (project: ProjectWithTeam, userId: string): boolean => {
  return isProjectOwner(project, userId) || isProjectMember(project, userId)
}

export const getProjectMemberRole = (project: ProjectWithTeam, userId: string): 'owner' | 'member' | null => {
  if (isProjectOwner(project, userId)) return 'owner'

  const member = project.team_members.find(m => m.user_id === userId)
  return member ? member.role : null
}

export const canManageProject = (project: ProjectWithTeam, userId: string): boolean => {
  return isProjectOwner(project, userId)
}

export const canManageTeam = (project: ProjectWithTeam, userId: string): boolean => {
  return isProjectOwner(project, userId)
}

// Database field mappings
export const mapProjectToDatabase = (project: Partial<Project>) => {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    integration_key: project.integration_key,
    domain: project.domain,
    allowed_origins: project.allowed_origins ? JSON.stringify(project.allowed_origins) : '[]',
    webhook_url: project.webhook_url,
    status: project.status,
    settings: project.settings ? JSON.stringify(project.settings) : null,
    owner_id: project.owner_id,
    created_at: project.created_at,
    updated_at: project.updated_at,
    last_activity_at: project.last_activity_at
  }
}

export const mapDatabaseToProject = (dbProject: any): Project => {
  return ProjectSchema.parse({
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    integration_key: dbProject.integration_key,
    domain: dbProject.domain,
    allowed_origins: dbProject.allowed_origins ? JSON.parse(dbProject.allowed_origins) : [],
    webhook_url: dbProject.webhook_url,
    status: dbProject.status,
    settings: dbProject.settings ? JSON.parse(dbProject.settings) : {
      auto_acknowledge: false,
      email_notifications: true,
      slack_notifications: false,
      jira_integration: false,
      rate_limit_per_hour: 100
    },
    owner_id: dbProject.owner_id,
    created_at: new Date(dbProject.created_at),
    updated_at: new Date(dbProject.updated_at),
    last_activity_at: dbProject.last_activity_at ? new Date(dbProject.last_activity_at) : null
  })
}