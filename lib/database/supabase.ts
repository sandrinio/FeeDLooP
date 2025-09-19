/**
 * Database Connection and Supabase Client Setup
 * T042: Database connection and Supabase client setup in lib/database/supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Environment variables validation (using process.env for Edge Runtime compatibility)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable')
}

// Public Supabase client (for client-side operations)
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

// Admin Supabase client (for server-side operations with elevated privileges)
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null

// Database connection helpers
export class DatabaseConnection {
  private static instance: DatabaseConnection
  private client: typeof supabase

  private constructor() {
    this.client = supabase
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection()
    }
    return DatabaseConnection.instance
  }

  public getClient() {
    return this.client
  }

  public getAdminClient() {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available - missing SUPABASE_SERVICE_ROLE_KEY')
    }
    return supabaseAdmin
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('fl_users')
        .select('id')
        .limit(1)

      return !error
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }

  // Connection status
  public async getConnectionStatus(): Promise<{
    connected: boolean
    latency?: number
    error?: string
  }> {
    const startTime = Date.now()

    try {
      const { error } = await this.client
        .from('fl_users')
        .select('id')
        .limit(1)

      const latency = Date.now() - startTime

      if (error) {
        return {
          connected: false,
          error: error.message
        }
      }

      return {
        connected: true,
        latency
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Database utility functions
export const db = DatabaseConnection.getInstance()

// Query helpers with proper error handling
export class DatabaseError extends Error {
  public code?: string
  public details?: string

  constructor(message: string, code?: string, details?: string) {
    super(message)
    this.name = 'DatabaseError'
    this.code = code
    this.details = details
  }
}

export const handleDatabaseError = (error: any): never => {
  if (error?.code) {
    throw new DatabaseError(
      error.message || 'Database operation failed',
      error.code,
      error.details
    )
  }

  throw new DatabaseError(
    error?.message || 'Unknown database error'
  )
}

// Transaction helpers
export const withTransaction = async <T>(
  operation: (client: typeof supabase) => Promise<T>
): Promise<T> => {
  // Note: Supabase doesn't support explicit transactions in the same way as raw SQL
  // Each operation is atomic, but we can implement retry logic
  const maxRetries = 3
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(supabase)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      if (attempt === maxRetries) {
        break
      }

      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 100
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Real-time subscription helpers
export const subscribeToTable = <T = any>(
  table: string,
  callback: (payload: T) => void,
  filter?: string
) => {
  const subscription = supabase
    .channel(`public:${table}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table,
        filter
      } as any,
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(subscription)
  }
}

// User session helpers
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    throw new DatabaseError('Failed to get current user', error.name, error.message)
  }

  return user
}

export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    throw new DatabaseError('Failed to get current session', error.name, error.message)
  }

  return session
}

// Row Level Security helpers
export const setUserContext = async (userId: string) => {
  // Set user context for RLS policies
  const { error } = await supabase.rpc('set_user_context' as any, { user_id: userId } as any)

  if (error) {
    throw new DatabaseError('Failed to set user context', error.code, error.message)
  }
}

// Database migration helpers
export const runMigration = async (migrationSql: string) => {
  if (!supabaseAdmin) {
    throw new Error('Admin client required for migrations')
  }

  const { error } = await supabaseAdmin.rpc('run_migration' as any, {
    migration_sql: migrationSql
  } as any)

  if (error) {
    throw new DatabaseError('Migration failed', error.code, error.message)
  }
}

// Connection pool monitoring (for serverless optimization)
export const connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  failedConnections: 0,

  increment() {
    this.totalConnections++
    this.activeConnections++
  },

  decrement() {
    this.activeConnections--
  },

  fail() {
    this.failedConnections++
  },

  getStats() {
    return {
      total: this.totalConnections,
      active: this.activeConnections,
      failed: this.failedConnections,
      successRate: this.totalConnections > 0
        ? ((this.totalConnections - this.failedConnections) / this.totalConnections * 100)
        : 100
    }
  }
}

// Performance monitoring
export const measureQuery = async <T>(
  operation: () => Promise<T>,
  queryName: string
): Promise<T> => {
  const startTime = Date.now()

  try {
    connectionStats.increment()
    const result = await operation()
    const duration = Date.now() - startTime

    if (process.env.NODE_ENV === 'development') {
      console.log(`Query ${queryName} completed in ${duration}ms`)
    }

    return result
  } catch (error) {
    connectionStats.fail()
    const duration = Date.now() - startTime

    console.error(`Query ${queryName} failed after ${duration}ms:`, error)
    throw error
  } finally {
    connectionStats.decrement()
  }
}

// Export commonly used patterns
export {
  type Database
} from './types'

export default supabase