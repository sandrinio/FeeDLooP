/**
 * Session Management Utilities
 * T048: Session management utilities in lib/auth/session.ts
 */

import { auth } from '@/lib/auth'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { supabaseAdmin } from '@/lib/database/supabase'
import { type UserSession, type PublicUser } from '@/lib/models/user'
import { DatabaseError } from '@/lib/database/supabase'

// Server-side session utilities
export class ServerSession {
  /**
   * Get current authenticated user session on server side
   */
  static async getCurrentSession(): Promise<Session | null> {
    try {
      return await auth()
    } catch (error) {
      console.error('Failed to get server session:', error)
      return null
    }
  }

  /**
   * Get current authenticated user data from session
   */
  static async getCurrentUser(): Promise<UserSession | null> {
    try {
      const session = await auth()

      if (!session?.user) {
        return null
      }

      return {
        user_id: session.user.id,
        email: session.user.email,
        first_name: session.user.first_name,
        last_name: session.user.last_name,
        company: session.user.company,
        avatar_url: session.user.avatar_url
      }
    } catch (error) {
      console.error('Failed to get current user from session:', error)
      return null
    }
  }

  /**
   * Require authentication - throws error if not authenticated
   */
  static async requireAuth(): Promise<UserSession> {
    const user = await this.getCurrentUser()

    if (!user) {
      throw new Error('Authentication required')
    }

    return user
  }

  /**
   * Check if user has access to project
   */
  static async hasProjectAccess(projectId: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()

      if (!user || !supabaseAdmin) {
        return false
      }

      // Check if user is owner
      const { data: project } = await supabaseAdmin
        .from('fl_projects')
        .select('owner_id')
        .eq('id', projectId)
        .single() as {
          data: { owner_id: string } | null
          error: any
        }

      if (project?.owner_id === user.user_id) {
        return true
      }

      // Check if user is team member
      const { data: invitation } = await supabaseAdmin
        .from('fl_project_invitations')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.user_id)
        .single() as {
          data: { id: string } | null
          error: any
        }

      return !!invitation
    } catch (error) {
      console.error('Failed to check project access:', error)
      return false
    }
  }

  /**
   * Check if user can invite others to project
   */
  static async canInviteToProject(projectId: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()

      if (!user || !supabaseAdmin) {
        return false
      }

      // Check if user is owner (owners can always invite)
      const { data: project } = await supabaseAdmin
        .from('fl_projects')
        .select('owner_id')
        .eq('id', projectId)
        .single() as {
          data: { owner_id: string } | null
          error: any
        }

      if (project?.owner_id === user.user_id) {
        return true
      }

      // Check if user is team member with invite permissions
      const { data: invitation } = await supabaseAdmin
        .from('fl_project_invitations')
        .select('can_invite')
        .eq('project_id', projectId)
        .eq('user_id', user.user_id)
        .single() as {
          data: { can_invite: boolean } | null
          error: any
        }

      return invitation?.can_invite || false
    } catch (error) {
      console.error('Failed to check invite permissions:', error)
      return false
    }
  }

  /**
   * Get user's role in a project
   */
  static async getProjectRole(projectId: string): Promise<'owner' | 'member' | null> {
    try {
      const user = await this.getCurrentUser()

      if (!user || !supabaseAdmin) {
        return null
      }

      // Check if user is owner
      const { data: project } = await supabaseAdmin
        .from('fl_projects')
        .select('owner_id')
        .eq('id', projectId)
        .single() as {
          data: { owner_id: string } | null
          error: any
        }

      if (project?.owner_id === user.user_id) {
        return 'owner'
      }

      // Check if user is team member
      const { data: invitation } = await supabaseAdmin
        .from('fl_project_invitations')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.user_id)
        .single() as {
          data: { role: string } | null
          error: any
        }

      return (invitation?.role as 'owner' | 'member') || null
    } catch (error) {
      console.error('Failed to get project role:', error)
      return null
    }
  }

  /**
   * Refresh user data from database
   */
  static async refreshUserData(userId: string): Promise<PublicUser | null> {
    try {
      if (!supabaseAdmin) {
        return null
      }

      const { data: user, error } = await supabaseAdmin
        .from('fl_users')
        .select('id, email, first_name, last_name, company, avatar_url, last_login_at, created_at, updated_at')
        .eq('id', userId)
        .single() as {
          data: {
            id: string
            email: string
            first_name: string
            last_name: string
            company: string
            avatar_url: string | null
            last_login_at: string | null
            created_at: string
            updated_at: string
          } | null
          error: any
        }

      if (error || !user) {
        return null
      }

      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company,
        avatar_url: user.avatar_url,
        last_login_at: user.last_login_at ? new Date(user.last_login_at) : null,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at)
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)
      return null
    }
  }
}

// Client-side session utilities
export class ClientSession {
  /**
   * Get current session on client side using the useSession hook
   * Note: This is meant to be used within React components
   */
  static useCurrentSession() {
    return useSession()
  }

  /**
   * Get current user from client session
   * Note: This should be used within React components
   */
  static useCurrentUser(): UserSession | null {
    const { data: session } = useSession()

    if (!session?.user) {
      return null
    }

    return {
      user_id: session.user.id,
      email: session.user.email,
      first_name: session.user.first_name,
      last_name: session.user.last_name,
      company: session.user.company,
      avatar_url: session.user.avatar_url
    }
  }

  /**
   * Check if user is authenticated
   * Note: This should be used within React components
   */
  static useIsAuthenticated(): boolean {
    const { data: session, status } = useSession()
    return status === 'authenticated' && !!session?.user
  }
}

// Session validation utilities
export class SessionValidator {
  /**
   * Validate session token format
   */
  static validateSessionToken(token: string): boolean {
    try {
      // Basic validation for custom session tokens
      const decoded = Buffer.from(token, 'base64').toString()
      const parsed = JSON.parse(decoded)

      return !!(parsed.userId && parsed.email && parsed.timestamp)
    } catch {
      return false
    }
  }

  /**
   * Check if session token is expired
   */
  static isSessionExpired(token: string, maxAge: number = 30 * 24 * 60 * 60 * 1000): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString()
      const parsed = JSON.parse(decoded)

      const tokenAge = Date.now() - parsed.timestamp
      return tokenAge > maxAge
    } catch {
      return true // Consider invalid tokens as expired
    }
  }

  /**
   * Extract user ID from session token
   */
  static getUserIdFromToken(token: string): string | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString()
      const parsed = JSON.parse(decoded)

      return parsed.userId || null
    } catch {
      return null
    }
  }
}

// Request header utilities
export class RequestAuth {
  /**
   * Get user ID from request headers (set by middleware)
   */
  static getUserIdFromHeaders(headers: Headers): string | null {
    return headers.get('x-user-id')
  }

  /**
   * Get user email from request headers (set by middleware)
   */
  static getUserEmailFromHeaders(headers: Headers): string | null {
    return headers.get('x-user-email')
  }

  /**
   * Extract bearer token from Authorization header
   */
  static getBearerToken(headers: Headers): string | null {
    const authorization = headers.get('authorization')

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null
    }

    return authorization.slice(7) // Remove 'Bearer ' prefix
  }

  /**
   * Create user session from request headers
   */
  static getUserFromHeaders(headers: Headers): UserSession | null {
    const userId = this.getUserIdFromHeaders(headers)
    const email = this.getUserEmailFromHeaders(headers)

    if (!userId || !email) {
      return null
    }

    // Additional user data would need to be fetched from database
    return {
      user_id: userId,
      email: email,
      first_name: '', // Would need to fetch from DB
      last_name: '',  // Would need to fetch from DB
      company: '',    // Would need to fetch from DB
      avatar_url: null
    }
  }
}

// Error classes for session management
export class SessionError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'SessionError'
  }
}

export class AuthenticationError extends SessionError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_REQUIRED')
  }
}

export class AuthorizationError extends SessionError {
  constructor(message: string = 'Access denied') {
    super(message, 'ACCESS_DENIED')
  }
}

// Utility functions
export const getDisplayName = (user: UserSession | PublicUser): string => {
  if ('first_name' in user && 'last_name' in user && user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`.trim()
  }
  return user.email
}

export const getInitials = (user: UserSession | PublicUser): string => {
  if ('first_name' in user && 'last_name' in user && user.first_name && user.last_name) {
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
  }
  return user.email.charAt(0).toUpperCase()
}

export const isSessionValid = (session: Session | null): session is Session => {
  return !!(session?.user?.id && session?.user?.email)
}

// Export main classes
export {
  ServerSession as server,
  ClientSession as client,
  SessionValidator as validator,
  RequestAuth as request
}