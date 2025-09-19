/**
 * Test endpoint to verify user email for testing purposes
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database admin client not available' },
        { status: 500 }
      )
    }

    // Update user to set email_verified = true
    const { data, error } = await supabaseAdmin
      .from('fl_users')
      .update({
        email_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase())
      .select('id, email, email_verified')

    if (error) {
      return NextResponse.json(
        { error: 'Failed to verify user', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User email verified successfully',
      user: data?.[0]
    })

  } catch (error) {
    console.error('Verify user error:', error)
    return NextResponse.json(
      {
        error: 'User verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}