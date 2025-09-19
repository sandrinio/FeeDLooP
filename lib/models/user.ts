/**
 * User Data Model with Zod Validation
 * T037: User data model with Zod validation in lib/models/user.ts
 */

import { z } from 'zod'

// User Role Enum
export const UserRoleSchema = z.enum(['owner', 'member'])
export type UserRole = z.infer<typeof UserRoleSchema>

// User Creation Schema (for registration)
export const CreateUserSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform(val => val.toLowerCase().trim()),

  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/^(?=.*\d)/, 'Password must contain at least one number')
    .regex(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character (@$!%*?&)'),

  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),

  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),

  company: z.string()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be less than 100 characters')
    .transform(val => val.trim())
})

// Registration form schema with confirm password
export const RegisterFormSchema = CreateUserSchema.extend({
  confirmPassword: z.string()
    .min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// User Login Schema
export const LoginUserSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .transform(val => val.toLowerCase().trim()),

  password: z.string()
    .min(1, 'Password is required')
})

// User Update Schema (for profile updates)
export const UpdateUserSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),

  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),

  company: z.string()
    .min(1, 'Company is required')
    .max(100, 'Company name must be less than 100 characters')
    .optional(),

  avatar_url: z.string()
    .url('Invalid avatar URL')
    .optional()
    .nullable()
})

// Full User Schema (database representation)
export const UserSchema = z.object({
  id: z.string()
    .uuid('Invalid user ID format'),

  email: z.string()
    .email('Invalid email address'),

  password_hash: z.string()
    .min(1, 'Password hash is required'),

  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),

  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),

  company: z.string()
    .min(1, 'Company is required')
    .max(100, 'Company name must be less than 100 characters'),

  avatar_url: z.string()
    .url('Invalid avatar URL')
    .nullable()
    .optional(),

  email_verified: z.boolean()
    .default(false),

  last_login_at: z.date()
    .nullable()
    .optional(),

  created_at: z.date(),

  updated_at: z.date()
})

// Public User Schema (safe for API responses - no sensitive data)
export const PublicUserSchema = UserSchema.omit({
  password_hash: true,
  email_verified: true
})

// User Session Schema
export const UserSessionSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  company: z.string(),
  avatar_url: z.string().nullable().optional()
})

// Type exports
export type CreateUser = z.infer<typeof CreateUserSchema>
export type RegisterForm = z.infer<typeof RegisterFormSchema>
export type LoginUser = z.infer<typeof LoginUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type User = z.infer<typeof UserSchema>
export type PublicUser = z.infer<typeof PublicUserSchema>
export type UserSession = z.infer<typeof UserSessionSchema>

// Validation functions
export const validateCreateUser = (data: unknown) => CreateUserSchema.parse(data)
export const validateRegisterForm = (data: unknown) => RegisterFormSchema.parse(data)
export const validateLoginUser = (data: unknown) => LoginUserSchema.parse(data)
export const validateUpdateUser = (data: unknown) => UpdateUserSchema.parse(data)
export const validateUser = (data: unknown) => UserSchema.parse(data)
export const validatePublicUser = (data: unknown) => PublicUserSchema.parse(data)
export const validateUserSession = (data: unknown) => UserSessionSchema.parse(data)

// Safe validation functions (returns result object instead of throwing)
export const safeValidateCreateUser = (data: unknown) => CreateUserSchema.safeParse(data)
export const safeValidateRegisterForm = (data: unknown) => RegisterFormSchema.safeParse(data)
export const safeValidateLoginUser = (data: unknown) => LoginUserSchema.safeParse(data)
export const safeValidateUpdateUser = (data: unknown) => UpdateUserSchema.safeParse(data)
export const safeValidateUser = (data: unknown) => UserSchema.safeParse(data)
export const safeValidatePublicUser = (data: unknown) => PublicUserSchema.safeParse(data)
export const safeValidateUserSession = (data: unknown) => UserSessionSchema.safeParse(data)

// Helper functions
export const getUserDisplayName = (user: PublicUser | UserSession): string => {
  return `${user.first_name} ${user.last_name}`.trim()
}

export const getUserInitials = (user: PublicUser | UserSession): string => {
  return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
}

// Database field mappings (camelCase to snake_case)
export const mapUserToDatabase = (user: Partial<User>) => {
  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    first_name: user.first_name,
    last_name: user.last_name,
    company: user.company,
    avatar_url: user.avatar_url,
    email_verified: user.email_verified,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
    updated_at: user.updated_at
  }
}

export const mapDatabaseToUser = (dbUser: any): User => {
  return UserSchema.parse({
    id: dbUser.id,
    email: dbUser.email,
    password_hash: dbUser.password_hash,
    first_name: dbUser.first_name,
    last_name: dbUser.last_name,
    company: dbUser.company,
    avatar_url: dbUser.avatar_url,
    email_verified: dbUser.email_verified,
    last_login_at: dbUser.last_login_at ? new Date(dbUser.last_login_at) : null,
    created_at: new Date(dbUser.created_at),
    updated_at: new Date(dbUser.updated_at)
  })
}