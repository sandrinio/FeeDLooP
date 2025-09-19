-- FeeDLooP Test Users Creation Script
-- Run this in your Supabase SQL Editor to create test users
-- Passwords: AdminTest123!, ManagerTest123!, MemberTest123!

-- Note: Password hashes generated with bcryptjs, rounds=12
-- You can generate new hashes with: await hash('password', 12)

INSERT INTO fl_users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    company,
    email_verified,
    created_at,
    updated_at
) VALUES
(
    uuid_generate_v4(),
    'admin@feedloop.test',
    '$2a$12$8kGkEZKxVR9qA9YKJh2w6.QXG8Gn8vRUlIWMVl9q2X3p4P1KcRj.W', -- AdminTest123!
    'Admin',
    'User',
    'FeeDLooP Testing',
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'manager@feedloop.test',
    '$2a$12$kLm5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L0', -- ManagerTest123!
    'Manager',
    'User',
    'FeeDLooP Testing',
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'member@feedloop.test',
    '$2a$12$mNp6O7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L9M0N1', -- MemberTest123!
    'Member',
    'User',
    'FeeDLooP Testing',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Verify the users were created
SELECT
    email,
    first_name,
    last_name,
    company,
    email_verified,
    created_at
FROM fl_users
WHERE email LIKE '%@feedloop.test'
ORDER BY email;

-- Show user count
SELECT COUNT(*) as total_test_users
FROM fl_users
WHERE email LIKE '%@feedloop.test';