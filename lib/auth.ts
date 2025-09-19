/**
 * NextAuth.js v5 Configuration
 * Authentication configuration for the application
 */

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { supabaseAdmin } from '@/lib/database/supabase'
import { validateLoginUser, type UserSession } from '@/lib/models/user'

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: UserSession & {
      id: string
    }
  }

  interface User {
    id: string
    email: string
    first_name: string
    last_name: string
    company: string
    avatar_url: string | null
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your@email.com'
        },
        password: {
          label: 'Password',
          type: 'password'
        }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          // Validate input format
          const validation = validateLoginUser({
            email: credentials.email as string,
            password: credentials.password as string
          })

          if (!supabaseAdmin) {
            console.error('Supabase admin client not available')
            return null
          }

          // Find user by email
          const { data: user, error } = await supabaseAdmin
            .from('fl_users')
            .select('id, email, password_hash, first_name, last_name, company, avatar_url, email_verified')
            .eq('email', validation.email.toLowerCase())
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

          if (error || !user) {
            console.error('User not found:', error)
            return null
          }

          // Check if email is verified (temporarily disabled for testing)
          // if (!user.email_verified) {
          //   console.error('Email not verified for user:', user.email)
          //   return null
          // }

          // Verify password
          const isPasswordValid = await compare(validation.password, user.password_hash)

          if (!isPasswordValid) {
            console.error('Invalid password for user:', user.email)
            return null
          }

          // Update last login
          await (supabaseAdmin as any)
            .from('fl_users')
            .update({
              last_login_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

          // Return user object for session
          return {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            company: user.company,
            avatar_url: user.avatar_url
          }
        } catch (error) {
          console.error('Authorization error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Persist user data in token
      if (user) {
        token.id = user.id
        token.first_name = user.first_name
        token.last_name = user.last_name
        token.company = user.company
        token.avatar_url = user.avatar_url
      }
      return token
    },
    async session({ session, token }) {
      // Send user data to client
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.user_id = token.id as string
        session.user.first_name = token.first_name as string
        session.user.last_name = token.last_name as string
        session.user.company = token.company as string
        session.user.avatar_url = token.avatar_url as string | null
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  trustHost: true
})
