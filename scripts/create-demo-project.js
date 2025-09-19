#!/usr/bin/env node

/**
 * Create Demo Project Script
 * Creates a demo project in the database for widget testing
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createDemoProject() {
  try {
    console.log('Creating demo project...')

    // Check if demo project already exists
    const { data: existingProject, error: checkError } = await supabase
      .from('fl_projects')
      .select('*')
      .eq('integration_key', 'flp_demo12345678901234')
      .single()

    if (existingProject) {
      console.log('Demo project already exists:', existingProject)
      return existingProject
    }

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking for existing project:', checkError)
      throw checkError
    }

    // First create a demo user for the project owner
    const userId = uuidv4()
    console.log('Creating demo user...')

    const { data: user, error: userError } = await supabase
      .from('fl_users')
      .insert({
        id: userId,
        email: 'demo@feedloop.com',
        password_hash: 'demo_hash_not_used',
        first_name: 'Demo',
        last_name: 'User',
        company: 'FeeDLooP Demo',
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError && userError.code !== '23505') { // 23505 = duplicate key (user might already exist)
      console.error('Error creating demo user:', userError)
      throw userError
    }

    // Create demo project
    const projectId = uuidv4()
    const { data: project, error: createError } = await supabase
      .from('fl_projects')
      .insert({
        id: projectId,
        name: 'Demo Project',
        owner_id: userId,
        integration_key: 'flp_demo12345678901234',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating demo project:', createError)
      throw createError
    }

    console.log('Demo project created successfully:', project)
    return project

  } catch (error) {
    console.error('Failed to create demo project:', error)
    process.exit(1)
  }
}

// Run the script
createDemoProject()
  .then(() => {
    console.log('Demo project setup completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Demo project setup failed:', error)
    process.exit(1)
  })