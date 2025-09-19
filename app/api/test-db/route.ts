/**
 * Database Connectivity Test Endpoint
 * This endpoint tests database connection and lists existing tables
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database admin client not available' },
        { status: 500 }
      )
    }

    // Test 1: Try to query fl_users table directly (will fail if doesn't exist)
    const { data: usersTest, error: usersError } = await supabaseAdmin
      .from('fl_users')
      .select('id')
      .limit(1)

    return NextResponse.json({
      success: true,
      connection: 'Connected successfully',
      fl_users_table: {
        exists: !usersError,
        error: usersError ? {
          code: usersError.code,
          message: usersError.message
        } : null,
        data: usersTest
      },
      environment: {
        supabase_url: process.env.SUPABASE_URL?.substring(0, 30) + '...',
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        database_url: process.env.DATABASE_URL?.substring(0, 30) + '...'
      }
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      {
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}