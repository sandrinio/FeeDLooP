/**
 * Home Page - Root Route
 * Redirects users to the dashboard
 */

import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to dashboard (which will handle auth check and redirect to login if needed)
  redirect('/dashboard')
}
