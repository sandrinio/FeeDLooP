/**
 * User Service Layer with CRUD Operations
 * T083: User service layer with CRUD operations in lib/services/userService.ts
 */

import { supabaseAdmin, handleDatabaseError, measureQuery, DatabaseError } from '@/lib/database/supabase'
import {
  CreateUser,
  UpdateUser,
  PublicUser,
  UserSession,
  validateCreateUser,
  validateUpdateUser,
  PublicUserSchema,
  UserSessionSchema
} from '@/lib/models/user'
import bcrypt from 'bcrypt'

export class UserService {
  private static instance: UserService

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  /**
   * Create a new user account
   */
  async createUser(userData: CreateUser): Promise<PublicUser> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Validate input data
      const validatedData = validateCreateUser(userData)

      // Hash the password
      const saltRounds = 12
      const password_hash = await bcrypt.hash(validatedData.password, saltRounds)

      // Check if user already exists
      const existingUser = await this.getUserByEmail(validatedData.email)
      if (existingUser) {
        throw new DatabaseError('User with this email already exists', 'USER_EXISTS')
      }

      // Create user in database
      const { data: user, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .insert({
            email: validatedData.email,
            password_hash,
            first_name: validatedData.first_name,
            last_name: validatedData.last_name,
            company: validatedData.company,
            email_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single(),
        'createUser'
      )

      if (error) {
        if (error.code === '23505') {
          throw new DatabaseError('User with this email already exists', 'USER_EXISTS')
        }
        handleDatabaseError(error)
      }

      // Return public user data
      return PublicUserSchema.parse({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company,
        avatar_url: user.avatar_url,
        last_login_at: user.last_login_at ? new Date(user.last_login_at) : null,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at)
      })

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<PublicUser | null> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: user, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            company,
            avatar_url,
            last_login_at,
            created_at,
            updated_at
          `)
          .eq('id', userId)
          .single(),
        'getUserById'
      )

      if (error) {
        if (error.code === 'PGRST116') {
          return null // User not found
        }
        handleDatabaseError(error)
      }

      return PublicUserSchema.parse({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company,
        avatar_url: user.avatar_url,
        last_login_at: user.last_login_at ? new Date(user.last_login_at) : null,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at)
      })

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<PublicUser | null> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: user, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            company,
            avatar_url,
            last_login_at,
            created_at,
            updated_at
          `)
          .eq('email', email.toLowerCase().trim())
          .single(),
        'getUserByEmail'
      )

      if (error) {
        if (error.code === 'PGRST116') {
          return null // User not found
        }
        handleDatabaseError(error)
      }

      return PublicUserSchema.parse({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company,
        avatar_url: user.avatar_url,
        last_login_at: user.last_login_at ? new Date(user.last_login_at) : null,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at)
      })

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get user by email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get user with password hash for authentication
   */
  async getUserWithPassword(email: string): Promise<any | null> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: user, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .single(),
        'getUserWithPassword'
      )

      if (error) {
        if (error.code === 'PGRST116') {
          return null // User not found
        }
        handleDatabaseError(error)
      }

      return user

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get user with password: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, userData: UpdateUser): Promise<PublicUser> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Validate input data
      const validatedData = validateUpdateUser(userData)

      // Check if user exists
      const existingUser = await this.getUserById(userId)
      if (!existingUser) {
        throw new DatabaseError('User not found', 'USER_NOT_FOUND')
      }

      // Update user in database
      const updatePayload = {
        ...validatedData,
        updated_at: new Date().toISOString()
      }

      const { data: user, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .update(updatePayload)
          .eq('id', userId)
          .select(`
            id,
            email,
            first_name,
            last_name,
            company,
            avatar_url,
            last_login_at,
            created_at,
            updated_at
          `)
          .single(),
        'updateUser'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return PublicUserSchema.parse({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company,
        avatar_url: user.avatar_url,
        last_login_at: user.last_login_at ? new Date(user.last_login_at) : null,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at)
      })

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .update({
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId),
        'updateLastLogin'
      )

      if (error) {
        handleDatabaseError(error)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to update last login: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify user's email
   */
  async verifyEmail(userId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .update({
            email_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId),
        'verifyEmail'
      )

      if (error) {
        handleDatabaseError(error)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to verify email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, newPassword: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Hash the new password
      const saltRounds = 12
      const password_hash = await bcrypt.hash(newPassword, saltRounds)

      const { error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .update({
            password_hash,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId),
        'changePassword'
      )

      if (error) {
        handleDatabaseError(error)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to change password: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<UserSession | null> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const user = await this.getUserWithPassword(email)
      if (!user) {
        return null
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash)
      if (!isPasswordValid) {
        return null
      }

      // Update last login
      await this.updateLastLogin(user.id)

      // Return user session data
      return UserSessionSchema.parse({
        user_id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company,
        avatar_url: user.avatar_url
      })

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to verify password: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete user account
   */
  async deleteUser(userId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Check if user exists
      const existingUser = await this.getUserById(userId)
      if (!existingUser) {
        throw new DatabaseError('User not found', 'USER_NOT_FOUND')
      }

      // Delete user (cascade delete will handle related records)
      const { error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .delete()
          .eq('id', userId),
        'deleteUser'
      )

      if (error) {
        handleDatabaseError(error)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search users by email or name
   */
  async searchUsers(query: string, limit: number = 10): Promise<PublicUser[]> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const searchTerm = `%${query.toLowerCase().trim()}%`

      const { data: users, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            company,
            avatar_url,
            last_login_at,
            created_at,
            updated_at
          `)
          .or(`email.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
          .limit(limit)
          .order('created_at', { ascending: false }),
        'searchUsers'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return (users || []).map((user: any) => PublicUserSchema.parse({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company,
        avatar_url: user.avatar_url,
        last_login_at: user.last_login_at ? new Date(user.last_login_at) : null,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at)
      }))

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get users by IDs (batch operation)
   */
  async getUsersByIds(userIds: string[]): Promise<PublicUser[]> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: users, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            company,
            avatar_url,
            last_login_at,
            created_at,
            updated_at
          `)
          .in('id', userIds),
        'getUsersByIds'
      )

      if (error) {
        handleDatabaseError(error)
      }

      return (users || []).map((user: any) => PublicUserSchema.parse({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company,
        avatar_url: user.avatar_url,
        last_login_at: user.last_login_at ? new Date(user.last_login_at) : null,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at)
      }))

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get users by IDs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const userService = UserService.getInstance()