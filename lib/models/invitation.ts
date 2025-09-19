/**
 * ProjectInvitation Data Model with Zod Validation
 * T039: ProjectInvitation data model with Zod validation in lib/models/invitation.ts
 */

import { z } from 'zod'

// Invitation Status Enum
export const InvitationStatusSchema = z.enum(['pending', 'accepted', 'declined', 'expired', 'revoked'])
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>

// User Role Enum (from user model)
export const InvitationRoleSchema = z.enum(['owner', 'member'])
export type InvitationRole = z.infer<typeof InvitationRoleSchema>

// Create Invitation Schema
export const CreateInvitationSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),

  role: InvitationRoleSchema
    .default('member'),

  message: z.string()
    .max(500, 'Personal message must be less than 500 characters')
    .optional()
    .nullable()
})

// Update Invitation Schema (for status changes)
export const UpdateInvitationSchema = z.object({
  status: InvitationStatusSchema,

  responded_at: z.date()
    .optional()
    .nullable()
})

// Accept/Decline Invitation Schema
export const RespondToInvitationSchema = z.object({
  action: z.enum(['accept', 'decline']),

  token: z.string()
    .min(1, 'Invitation token is required')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid invitation token format')
})

// Full ProjectInvitation Schema (database representation)
export const ProjectInvitationSchema = z.object({
  id: z.string()
    .uuid('Invalid invitation ID format'),

  project_id: z.string()
    .uuid('Invalid project ID format'),

  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),

  role: InvitationRoleSchema,

  status: InvitationStatusSchema
    .default('pending'),

  token: z.string()
    .min(1, 'Invitation token is required')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid invitation token format'),

  message: z.string()
    .max(500, 'Personal message must be less than 500 characters')
    .nullable()
    .optional(),

  invited_by: z.string()
    .uuid('Invalid inviter ID format'),

  invited_at: z.date(),

  expires_at: z.date(),

  responded_at: z.date()
    .nullable()
    .optional(),

  created_at: z.date(),

  updated_at: z.date()
})

// Invitation with Project Info Schema (includes project and inviter details)
export const InvitationWithDetailsSchema = ProjectInvitationSchema.extend({
  project: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    domain: z.string().nullable().optional()
  }),

  inviter: z.object({
    id: z.string().uuid(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
    company: z.string()
  })
})

// Invitation List Item Schema (for invitation listings)
export const InvitationListItemSchema = ProjectInvitationSchema.pick({
  id: true,
  email: true,
  role: true,
  status: true,
  invited_at: true,
  expires_at: true,
  responded_at: true
}).extend({
  inviter_name: z.string(),
  is_expired: z.boolean()
})

// Bulk Invitation Schema
export const BulkInvitationSchema = z.object({
  invitations: z.array(CreateInvitationSchema)
    .min(1, 'At least one invitation is required')
    .max(20, 'Maximum 20 invitations per batch'),

  message: z.string()
    .max(500, 'Personal message must be less than 500 characters')
    .optional()
    .nullable()
})

// Type exports
export type CreateInvitation = z.infer<typeof CreateInvitationSchema>
export type UpdateInvitation = z.infer<typeof UpdateInvitationSchema>
export type RespondToInvitation = z.infer<typeof RespondToInvitationSchema>
export type ProjectInvitation = z.infer<typeof ProjectInvitationSchema>
export type InvitationWithDetails = z.infer<typeof InvitationWithDetailsSchema>
export type InvitationListItem = z.infer<typeof InvitationListItemSchema>
export type BulkInvitation = z.infer<typeof BulkInvitationSchema>

// Validation functions
export const validateCreateInvitation = (data: unknown) => CreateInvitationSchema.parse(data)
export const validateUpdateInvitation = (data: unknown) => UpdateInvitationSchema.parse(data)
export const validateRespondToInvitation = (data: unknown) => RespondToInvitationSchema.parse(data)
export const validateProjectInvitation = (data: unknown) => ProjectInvitationSchema.parse(data)
export const validateInvitationWithDetails = (data: unknown) => InvitationWithDetailsSchema.parse(data)
export const validateInvitationListItem = (data: unknown) => InvitationListItemSchema.parse(data)
export const validateBulkInvitation = (data: unknown) => BulkInvitationSchema.parse(data)

// Safe validation functions
export const safeValidateCreateInvitation = (data: unknown) => CreateInvitationSchema.safeParse(data)
export const safeValidateUpdateInvitation = (data: unknown) => UpdateInvitationSchema.safeParse(data)
export const safeValidateRespondToInvitation = (data: unknown) => RespondToInvitationSchema.safeParse(data)
export const safeValidateProjectInvitation = (data: unknown) => ProjectInvitationSchema.safeParse(data)
export const safeValidateInvitationWithDetails = (data: unknown) => InvitationWithDetailsSchema.safeParse(data)
export const safeValidateInvitationListItem = (data: unknown) => InvitationListItemSchema.safeParse(data)
export const safeValidateBulkInvitation = (data: unknown) => BulkInvitationSchema.safeParse(data)

// Helper functions
export const generateInvitationToken = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
  const length = 32
  let result = ''

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

export const getInvitationExpiryDate = (daysFromNow: number = 7): Date => {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + daysFromNow)
  return expiryDate
}

export const isInvitationExpired = (invitation: ProjectInvitation): boolean => {
  return new Date() > invitation.expires_at
}

export const isInvitationPending = (invitation: ProjectInvitation): boolean => {
  return invitation.status === 'pending' && !isInvitationExpired(invitation)
}

export const canRespondToInvitation = (invitation: ProjectInvitation): boolean => {
  return invitation.status === 'pending' && !isInvitationExpired(invitation)
}

export const canRevokeInvitation = (invitation: ProjectInvitation): boolean => {
  return invitation.status === 'pending'
}

export const getInvitationStatusDisplay = (invitation: ProjectInvitation): string => {
  if (isInvitationExpired(invitation) && invitation.status === 'pending') {
    return 'Expired'
  }

  switch (invitation.status) {
    case 'pending':
      return 'Pending'
    case 'accepted':
      return 'Accepted'
    case 'declined':
      return 'Declined'
    case 'expired':
      return 'Expired'
    case 'revoked':
      return 'Revoked'
    default:
      return 'Unknown'
  }
}

export const getDaysUntilExpiry = (invitation: ProjectInvitation): number => {
  const now = new Date()
  const diffTime = invitation.expires_at.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

// Email template data helpers
export const getInvitationEmailData = (invitation: InvitationWithDetails) => {
  return {
    invitee_email: invitation.email,
    inviter_name: `${invitation.inviter.first_name} ${invitation.inviter.last_name}`,
    inviter_email: invitation.inviter.email,
    inviter_company: invitation.inviter.company,
    project_name: invitation.project.name,
    project_description: invitation.project.description,
    role: invitation.role,
    message: invitation.message,
    invitation_url: `${process.env.NEXTAUTH_URL}/invitations/${invitation.token}`,
    expires_at: invitation.expires_at.toLocaleDateString(),
    days_until_expiry: getDaysUntilExpiry(invitation)
  }
}

// Database field mappings
export const mapInvitationToDatabase = (invitation: Partial<ProjectInvitation>) => {
  return {
    id: invitation.id,
    project_id: invitation.project_id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    token: invitation.token,
    message: invitation.message,
    invited_by: invitation.invited_by,
    invited_at: invitation.invited_at,
    expires_at: invitation.expires_at,
    responded_at: invitation.responded_at,
    created_at: invitation.created_at,
    updated_at: invitation.updated_at
  }
}

export const mapDatabaseToInvitation = (dbInvitation: any): ProjectInvitation => {
  return ProjectInvitationSchema.parse({
    id: dbInvitation.id,
    project_id: dbInvitation.project_id,
    email: dbInvitation.email,
    role: dbInvitation.role,
    status: dbInvitation.status,
    token: dbInvitation.token,
    message: dbInvitation.message,
    invited_by: dbInvitation.invited_by,
    invited_at: new Date(dbInvitation.invited_at),
    expires_at: new Date(dbInvitation.expires_at),
    responded_at: dbInvitation.responded_at ? new Date(dbInvitation.responded_at) : null,
    created_at: new Date(dbInvitation.created_at),
    updated_at: new Date(dbInvitation.updated_at)
  })
}