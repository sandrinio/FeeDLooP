#!/usr/bin/env node

/**
 * Database Migration Runner
 * Applies the pending invitations enhancement migration
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('🚀 Running schema fixes migration...')

    // Read migration SQL file
    const migrationPath = path.join(__dirname, '..', 'database-migrations', '002-schema-fixes.sql')

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      // For schema changes, we need to execute manually
      console.log('📝 Schema changes require manual execution...')
      console.log('⚠️  Please execute the migration SQL manually in your Supabase SQL Editor:')
      console.log(`   File: ${migrationPath}`)
      console.log('')
      console.log('🔧 Or execute these commands directly:')
      console.log('')
      console.log('-- Add missing columns to fl_reports table')
      console.log('ALTER TABLE fl_reports ADD COLUMN IF NOT EXISTS browser_info JSON;')
      console.log('ALTER TABLE fl_reports ADD COLUMN IF NOT EXISTS page_url TEXT;')
      console.log('')
      console.log('-- Add missing column to fl_attachments table')
      console.log('ALTER TABLE fl_attachments ADD COLUMN IF NOT EXISTS file_url TEXT;')
      console.log('')
      console.log('-- Update enums to include missing values')
      console.log("ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'feature';")
      console.log("ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'new';")
      console.log('')
      console.log('-- Update file_url for existing attachments')
      console.log('UPDATE fl_attachments SET file_url = file_path WHERE file_url IS NULL;')

      return
    }

    console.log('✅ Migration completed successfully!')

    // Verify migration by checking columns exist
    const { data: reportColumns, error: reportError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'fl_reports')
      .in('column_name', ['browser_info', 'page_url'])

    const { data: attachmentColumns, error: attachmentError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'fl_attachments')
      .eq('column_name', 'file_url')

    if (!reportError && reportColumns?.length === 2) {
      console.log('✅ Verified: browser_info and page_url columns added to fl_reports')
    }

    if (!attachmentError && attachmentColumns?.length === 1) {
      console.log('✅ Verified: file_url column added to fl_attachments')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('')
    console.log('📋 Manual Migration Instructions:')
    console.log('1. Open Supabase Dashboard')
    console.log('2. Go to SQL Editor')
    console.log('3. Paste the contents of database-migrations/002-schema-fixes.sql')
    console.log('4. Click "Run" to execute the migration')
    process.exit(1)
  }
}

console.log('🔧 FeeDLooP Database Migration Runner')
console.log('====================================')
runMigration()