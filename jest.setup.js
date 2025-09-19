import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Mock environment variables for tests
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.MINIO_ENDPOINT = 'localhost'
process.env.MINIO_PORT = '9000'
process.env.MINIO_ACCESS_KEY = 'test-access-key'
process.env.MINIO_SECRET_KEY = 'test-secret-key'