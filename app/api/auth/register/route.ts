/**
 * User Registration API Endpoint
 * T046: POST /api/auth/register endpoint implementation in app/api/auth/register/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { supabaseAdmin } from '@/lib/database/supabase'
import {
  validateCreateUser,
  safeValidateCreateUser,
  mapDatabaseToUser,
  type PublicUser
} from '@/lib/models/user'
import { DatabaseError } from '@/lib/database/supabase'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()

    // Validate input data
    const validationResult = safeValidateCreateUser(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const userData = validationResult.data

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('fl_users')
      .select('id, email')
      .eq('email', userData.email.toLowerCase())
      .single() as {
        data: { id: string; email: string } | null
        error: any
      }

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Database error checking existing user:', checkError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hash(userData.password, 12)

    // Create user record
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('fl_users')
      .insert({
        email: userData.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: userData.first_name,
        last_name: userData.last_name,
        company: userData.company,
        email_verified: false, // Set to true for now, implement email verification later
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .select('id, email, first_name, last_name, company, avatar_url, email_verified, created_at, updated_at')
      .single() as {
        data: {
          id: string
          email: string
          first_name: string
          last_name: string
          company: string
          avatar_url: string | null
          email_verified: boolean
          created_at: string
          updated_at: string
        } | null
        error: any
      }

    if (createError) {
      console.error('Database error creating user:', createError)

      // Handle specific database errors
      if (createError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    if (!newUser) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Check for processed pending invitations (after user creation triggers)
    // Give the triggers a moment to process
    await new Promise(resolve => setTimeout(resolve, 100))

    const { data: processedInvitations, error: inviteError } = await supabaseAdmin
      .from('fl_pending_invitations')
      .select(`
        project_id,
        role,
        fl_projects!inner(
          name
        )
      `)
      .eq('email', userData.email.toLowerCase())
      .not('accepted_at', 'is', null)

    // Return public user data (no password)
    const publicUser: PublicUser = {
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      company: newUser.company,
      avatar_url: newUser.avatar_url,
      last_login_at: null,
      created_at: new Date(newUser.created_at),
      updated_at: new Date(newUser.updated_at)
    }

    // Build response message
    let message = 'Account created successfully'
    const processedProjects = []

    if (processedInvitations && processedInvitations.length > 0) {
      processedProjects.push(...processedInvitations.map(inv => ({
        project_id: inv.project_id,
        project_name: inv.fl_projects.name,
        role: inv.role
      })))

      message = `Account created successfully. You've been added to ${processedInvitations.length} project${processedInvitations.length > 1 ? 's' : ''}.`
    }

    // TODO: Send verification email
    // await sendVerificationEmail(newUser.email, newUser.id)

    return NextResponse.json(
      {
        user: publicUser,
        message,
        processed_invitations: processedProjects
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)

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

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

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