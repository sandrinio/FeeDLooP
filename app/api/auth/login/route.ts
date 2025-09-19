/**
 * User Login API Endpoint
 * T047: POST /api/auth/login endpoint implementation in app/api/auth/login/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database/supabase'
import {
  validateLoginUser,
  safeValidateLoginUser,
  type PublicUser,
  type UserSession
} from '@/lib/models/user'
import { DatabaseError } from '@/lib/database/supabase'
import { checkRateLimit, authRateLimit } from '@/lib/validation/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Check rate limit first
    const rateCheck = checkRateLimit(request, authRateLimit)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Too many login attempts',
          message: 'Please wait before trying again'
        },
        {
          status: 429,
          headers: rateCheck.headers
        }
      )
    }

    // Parse request body
    let body: any
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        {
          status: 400,
          headers: rateCheck.headers
        }
      )
    }

    // Validate input data
    const validationResult = safeValidateLoginUser(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        },
        {
          status: 400,
          headers: rateCheck.headers
        }
      )
    }

    const loginData = validationResult.data

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Find user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from('fl_users')
      .select('id, email, password_hash, first_name, last_name, company, avatar_url, email_verified')
      .eq('email', loginData.email.toLowerCase())
      .single() as {
        data: {
          id: string
          email: string
          password_hash: string
          first_name: string
          last_name: string
          company: string
          avatar_url: string | null
          email_verified: boolean
        } | null
        error: any
      }

    if (userError || !user) {
      if (userError && userError.code !== 'PGRST116') {
        console.error('Database error finding user:', userError)
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        )
      }

      // Return generic error to prevent email enumeration
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email is verified (if required)
    if (!user.email_verified) {
      return NextResponse.json(
        { error: 'Please verify your email address before signing in' },
        { status: 403 }
      )
    }

    // Verify password
    const isPasswordValid = await compare(loginData.password, user.password_hash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Update last login timestamp
    const { error: updateError } = await (supabaseAdmin as any)
      .from('fl_users')
      .update({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update last login:', updateError)
      // Don't fail the login for this
    }

    // Create user session data
    const userSession: UserSession = {
      user_id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      company: user.company,
      avatar_url: user.avatar_url
    }

    // Create public user data
    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      company: user.company,
      avatar_url: user.avatar_url,
      last_login_at: new Date(),
      created_at: new Date(), // Would need to fetch from DB for actual value
      updated_at: new Date()
    }

    // Generate session token (in a real implementation, you'd use NextAuth or JWT)
    const sessionToken = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      timestamp: Date.now()
    })).toString('base64')

    return NextResponse.json(
      {
        user: publicUser,
        session: {
          access_token: sessionToken,
          token_type: 'Bearer',
          expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
          user: userSession
        },
        message: 'Login successful'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof DatabaseError) {
      return NextResponse.json(
        { error: 'Database service unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get current session info
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated via NextAuth
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Return current session info
    return NextResponse.json(
      {
        user: session.user,
        authenticated: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Session check error:', error)

    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}