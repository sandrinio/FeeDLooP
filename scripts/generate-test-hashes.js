#!/usr/bin/env node

/**
 * Generate bcrypt hashes for test user passwords
 * Run: node scripts/generate-test-hashes.js
 */

const { hash } = require('bcryptjs');

const testPasswords = [
  { email: 'admin@feedloop.test', password: 'AdminTest123!' },
  { email: 'manager@feedloop.test', password: 'ManagerTest123!' },
  { email: 'member@feedloop.test', password: 'MemberTest123!' }
];

async function generateHashes() {
  console.log('🔐 Generating bcrypt hashes for test users...\n');

  for (const user of testPasswords) {
    const hashedPassword = await hash(user.password, 12);
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Hash: ${hashedPassword}`);
    console.log('---');
  }

  console.log('\n✅ Use these hashes in your SQL script or Supabase SQL Editor');
}

generateHashes().catch(console.error);