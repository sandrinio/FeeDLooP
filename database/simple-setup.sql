-- Simple Database Setup - Execute step by step
-- Run each section separately to identify where the issue occurs

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create the fl_users table (just this one first)
DROP TABLE IF EXISTS fl_users CASCADE;

CREATE TABLE fl_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    company VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 3: Verify table was created
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name = 'fl_users';

-- Step 4: Try inserting a test record
INSERT INTO fl_users (email, password_hash, first_name, last_name, company)
VALUES ('test@example.com', 'test-hash', 'Test', 'User', 'Test Company');

-- Step 5: Query the test record
SELECT id, email, first_name, last_name, company, created_at
FROM fl_users
WHERE email = 'test@example.com';

-- Step 6: Clean up test record
DELETE FROM fl_users WHERE email = 'test@example.com';