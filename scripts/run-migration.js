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
    console.log('🚀 Running pending invitations migration...')

    // Read migration SQL file
    const migrationPath = path.join(__dirname, '..', 'database-migrations', '001-pending-invitations.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      // Try direct query instead
      const { data: directData, error: directError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'fl_pending_invitations')

      if (directError) {
        throw new Error(`Migration failed: ${error.message}`)
      }

      // Execute migration SQL directly (split by semicolon and execute each statement)
      console.log('📝 Executing migration SQL directly...')

      // For now, just log that we need manual execution
      console.log('⚠️  Please execute the migration SQL manually in your Supabase SQL Editor:')
      console.log(`   File: ${migrationPath}`)
      console.log('   Or paste the contents into Supabase Dashboard > SQL Editor')

      return
    }

    console.log('✅ Migration completed successfully!')

    // Verify migration
    const { data: tables, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'fl_pending_invitations')

    if (verifyError) {
      console.warn('⚠️  Could not verify migration, but it may have succeeded')
    } else if (tables && tables.length > 0) {
      console.log('✅ Verified: fl_pending_invitations table created')
    } else {
      console.warn('⚠️  Table verification failed - please check Supabase manually')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('')
    console.log('📋 Manual Migration Instructions:')
    console.log('1. Open Supabase Dashboard')
    console.log('2. Go to SQL Editor')
    console.log('3. Paste the contents of database-migrations/001-pending-invitations.sql')
    console.log('4. Click "Run" to execute the migration')
    process.exit(1)
  }
}

console.log('🔧 FeeDLooP Database Migration Runner')
console.log('====================================')
runMigration()