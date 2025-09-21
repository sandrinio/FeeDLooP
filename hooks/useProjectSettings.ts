/**
 * T019: Project Settings Data Hook
 * Custom hook for fetching and managing project settings data
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProjectSettingsData, UseProjectSettingsResult } from '@/types/project-settings'

interface UseProjectSettingsOptions {
  projectId: string
  includeStatistics?: boolean
  includePermissions?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useProjectSettings({
  projectId,
  includeStatistics = true,
  includePermissions = true,
  autoRefresh = false,
  refreshInterval = 30000 // 30 seconds
}: UseProjectSettingsOptions): UseProjectSettingsResult {
  const [data, setData] = useState<ProjectSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      if (!includeStatistics) {
        params.append('include_statistics', 'false')
      }
      if (!includePermissions) {
        params.append('include_permissions', 'false')
      }

      const queryString = params.toString()
      const url = `/api/projects/${projectId}/settings${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required')
        } else if (response.status === 403) {
          throw new Error('Access denied - only project owners can access settings')
        } else if (response.status === 404) {
          throw new Error('Project not found')
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }
      }

      const settingsData = await response.json()

      // Ensure we have the expected structure
      if (!settingsData.project) {
        throw new Error('Invalid response structure: missing project data')
      }

      setData(settingsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project settings'
      setError(errorMessage)
      console.error('Error fetching project settings:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, includeStatistics, includePermissions])

  const refetch = useCallback(async () => {
    setLoading(true)
    await fetchSettings()
  }, [fetchSettings])

  // Initial fetch
  useEffect(() => {
    if (projectId) {
      fetchSettings()
    }
  }, [fetchSettings, projectId])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !projectId) {
      return
    }

    const interval = setInterval(() => {
      fetchSettings()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchSettings, projectId])

  // Reset state when projectId changes
  useEffect(() => {
    setData(null)
    setError(null)
    setLoading(true)
  }, [projectId])

  return {
    data,
    loading,
    error,
    refetch
  }
}