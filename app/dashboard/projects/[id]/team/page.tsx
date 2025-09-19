/**
 * Project Team Management Page
 * T075: Team invitation component and management
 * Manage team members, invitations, and permissions
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  UsersIcon,
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

interface TeamMember {
  user_id: string | null
  invitation_id?: string
  email: string
  name: string | null
  role: 'owner' | 'member' | 'admin'
  can_invite: boolean
  status: 'active' | 'pending'
  expires_at?: string
  created_at?: string
}

interface Project {
  id: string
  name: string
  owner_id: string
  members: TeamMember[]
}

export default function ProjectTeamPage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invitation form state
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member' as 'member' | 'admin',
    can_invite: false
  })
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (projectId) {
      fetchProjectTeam()
    }
  }, [projectId])

  const fetchProjectTeam = async () => {
    setLoading(true)
    setError(null)

    let retryCount = 0
    const maxRetries = 2

    try {
      while (retryCount <= maxRetries) {
        try {
          const response = await fetch(`/api/projects/${projectId}`)
          if (response.ok) {
            const data = await response.json()
            setProject(data)
            return // Success, exit the retry loop
          } else if (response.status === 404) {
            setError('Project not found')
            return
          } else {
            throw new Error('Failed to load team information')
          }
        } catch (err) {
          retryCount++
          if (retryCount > maxRetries) {
            throw err // Re-throw after max retries
          }
          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } catch (err) {
      setError('Failed to load team information')
    } finally {
      setLoading(false)
    }
  }

  const validateInviteForm = () => {
    const errors: Record<string, string> = {}

    if (!inviteForm.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
      errors.email = 'Please enter a valid email address'
    }

    // Check if user is already a team member
    if (project && project.members.some(member =>
      member.email.toLowerCase() === inviteForm.email.toLowerCase()
    )) {
      errors.email = 'This user is already a team member'
    }

    setInviteErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateInviteForm()) {
      return
    }

    setInviting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteForm.email.trim().toLowerCase(),
          role: inviteForm.role,
          can_invite: inviteForm.can_invite
        }),
      })

      if (response.ok) {
        // Refresh team data
        await fetchProjectTeam()

        // Reset form
        setInviteForm({ email: '', role: 'member', can_invite: false })
        setShowInviteForm(false)
        setInviteErrors({})
      } else {
        const errorData = await response.json()
        if (response.status === 404) {
          setInviteErrors({ email: 'No user found with this email address' })
        } else if (response.status === 409) {
          setInviteErrors({ email: 'User is already a team member' })
        } else if (errorData.details) {
          const serverErrors: Record<string, string> = {}
          errorData.details.forEach((error: any) => {
            serverErrors[error.field] = error.message
          })
          setInviteErrors(serverErrors)
        } else {
          setInviteErrors({ general: 'Failed to invite user. Please try again.' })
        }
      }
    } catch (err) {
      setInviteErrors({ general: 'Network error. Please try again.' })
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberIdOrInvitationId: string | null) => {
    if (!memberIdOrInvitationId) return

    // Find the member to get their status
    const member = project?.members.find(m =>
      m.user_id === memberIdOrInvitationId || m.invitation_id === memberIdOrInvitationId
    )

    const isRemovingPendingInvite = member?.status === 'pending'
    const confirmMessage = isRemovingPendingInvite
      ? 'Are you sure you want to cancel this invitation?'
      : 'Are you sure you want to remove this team member?'

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      // For pending invitations, we need to call a different endpoint or use different payload
      if (isRemovingPendingInvite && member?.invitation_id) {
        const response = await fetch(`/api/projects/${projectId}/invitations`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invitation_id: member.invitation_id,
            is_pending: true
          }),
        })

        if (response.ok) {
          // Refresh team data
          await fetchProjectTeam()
        } else {
          const errorData = await response.json()
          alert(errorData.error || 'Failed to cancel invitation')
        }
      } else {
        // Existing user removal
        const response = await fetch(`/api/projects/${projectId}/invitations`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: memberIdOrInvitationId }),
        })

        if (response.ok) {
          // Refresh team data
          await fetchProjectTeam()
        } else {
          const errorData = await response.json()
          alert(errorData.error || 'Failed to remove team member')
        }
      }
    } catch (err) {
      alert('Failed to remove team member')
    }
  }

  const getRoleBadge = (role: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (role) {
      case 'owner':
        return `${baseClasses} bg-purple-100 text-purple-800`
      case 'admin':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'member':
        return `${baseClasses} bg-green-100 text-green-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading team...</span>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Project not found'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
              <p className="text-gray-600">
                Manage team members and their permissions for {project.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
                <button
                  onClick={() => {
                    setShowInviteForm(false)
                    setInviteForm({ email: '', role: 'member', can_invite: false })
                    setInviteErrors({})
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              {inviteErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{inviteErrors.general}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    inviteErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="user@example.com"
                />
                {inviteErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{inviteErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as 'member' | 'admin' }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Admins can manage team members and project settings
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="can_invite"
                  checked={inviteForm.can_invite}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, can_invite: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="can_invite" className="ml-2 block text-sm text-gray-700">
                  Can invite other members
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false)
                    setInviteForm({ email: '', role: 'member', can_invite: false })
                    setInviteErrors({})
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviting ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Team Members ({project.members.length})
          </h2>
        </div>

        <div className="px-6 py-4">
          {project.members.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by inviting team members to collaborate on this project.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {project.members.map((member) => (
                <div
                  key={member.user_id || member.invitation_id || member.email}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      {member.role === 'owner' ? (
                        <ShieldCheckIcon className="h-5 w-5 text-yellow-600" />
                      ) : member.status === 'pending' ? (
                        <span className="text-sm font-medium text-orange-600">?</span>
                      ) : (
                        <span className="text-sm font-medium text-gray-700">
                          {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {member.name || member.email}
                        </p>
                        <span className={getRoleBadge(member.role)}>
                          {member.role}
                        </span>
                        {member.status === 'pending' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-sm text-gray-500">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          {member.email}
                        </div>
                        {member.can_invite && (
                          <div className="flex items-center text-sm text-green-600">
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Can invite others
                          </div>
                        )}
                        {member.status === 'pending' && member.expires_at && (
                          <div className="flex items-center text-sm text-orange-600">
                            <span>Expires {new Date(member.expires_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id || member.invitation_id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                        title={member.status === 'pending' ? 'Cancel invitation' : 'Remove team member'}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Permissions Info */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">
          Team Roles & Permissions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center mb-2">
              <ShieldCheckIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <h4 className="font-medium text-blue-900">Owner</h4>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Full project access</li>
              <li>• Manage team members</li>
              <li>• Delete project</li>
              <li>• All admin permissions</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                Admin
              </span>
              <h4 className="font-medium text-blue-900">Admin</h4>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Manage reports</li>
              <li>• Invite team members</li>
              <li>• Export data</li>
              <li>• Project settings</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                Member
              </span>
              <h4 className="font-medium text-blue-900">Member</h4>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• View reports</li>
              <li>• Update report status</li>
              <li>• Add comments</li>
              <li>• Basic access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}