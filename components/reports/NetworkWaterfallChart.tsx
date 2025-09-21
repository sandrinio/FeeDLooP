/**
 * Network Waterfall Chart Component
 * Enhanced Log Visualization - Phase 5: Network waterfall visualization
 *
 * Displays network requests in a waterfall format with timing information,
 * correlation indicators, and interactive features.
 */

'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  WifiIcon
} from '@heroicons/react/24/outline'

// Network request interface matching the enhanced data structure
interface NetworkRequest {
  name: string
  url?: string
  method?: string
  status?: number
  duration: number
  size?: number
  type?: string
  startTime?: string
  endTime?: string
  response_time?: number
  request_headers?: Record<string, string>
  response_headers?: Record<string, string>
  // Correlation data
  correlation_id?: string
  is_correlated?: boolean
  correlation_type?: string
  error_related?: boolean
}

interface NetworkWaterfallChartProps {
  requests: NetworkRequest[]
  correlatedItems?: string[] // IDs of correlated items to highlight
  selectedCorrelation?: string // Currently selected correlation
  selectedRequestIndex?: number // Index of selected request to highlight
  onRequestClick?: (request: NetworkRequest, index: number) => void
  height?: number
  className?: string
}

interface WaterfallBar {
  request: NetworkRequest
  index: number
  x: number
  y: number
  width: number
  color: string
  isCorrelated: boolean
  isErrorRelated: boolean
}

export default function NetworkWaterfallChart({
  requests,
  correlatedItems = [],
  selectedCorrelation,
  selectedRequestIndex,
  onRequestClick,
  height = 400,
  className = ''
}: NetworkWaterfallChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [filter, setFilter] = useState('')
  const [sortBy, setSortBy] = useState<'duration' | 'size' | 'startTime' | 'status'>('startTime')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    content: string
  }>({ visible: false, x: 0, y: 0, content: '' })

  // Filter and sort requests
  const processedRequests = useMemo(() => {
    let filtered = requests.filter(request =>
      !filter || request.name.toLowerCase().includes(filter.toLowerCase()) ||
      request.url?.toLowerCase().includes(filter.toLowerCase())
    )

    // Sort requests
    filtered.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortBy) {
        case 'duration':
          aVal = a.duration || 0
          bVal = b.duration || 0
          break
        case 'size':
          aVal = a.size || 0
          bVal = b.size || 0
          break
        case 'status':
          aVal = a.status || 0
          bVal = b.status || 0
          break
        case 'startTime':
        default:
          aVal = new Date(a.startTime || 0).getTime()
          bVal = new Date(b.startTime || 0).getTime()
          break
      }

      if (sortDirection === 'asc') {
        return aVal - bVal
      } else {
        return bVal - aVal
      }
    })

    return filtered
  }, [requests, filter, sortBy, sortDirection])

  // Calculate chart dimensions and data
  const chartData = useMemo(() => {
    console.log('Processing requests:', processedRequests.length, 'requests')
    console.log('First few requests:', processedRequests.slice(0, 3))

    if (processedRequests.length === 0) return { bars: [], maxDuration: 0, startTime: 0 }

    console.log('Sample request structure:', processedRequests[0])

    // Since requests only have duration but no start times, create artificial timeline
    // This simulates a waterfall where requests happen sequentially
    let currentTime = 0
    const requestsWithTimeline = processedRequests.map((req, index) => {
      const duration = req.duration || 0
      const startTime = currentTime
      const endTime = currentTime + duration
      currentTime += Math.max(duration * 0.1, 10) // Small gap between requests

      return {
        ...req,
        url: req.name, // Map 'name' field to 'url' for compatibility
        artificialStartTime: startTime,
        artificialEndTime: endTime,
        duration: duration
      }
    })

    const maxDuration = Math.max(...requestsWithTimeline.map(req => req.artificialEndTime), 1000)
    const timelineWidth = 510 // Width of timeline area (760 - 250 start position)

    // Create bars for each request
    const bars = requestsWithTimeline.map((req, index) => {
      const rowHeight = 35 // Increased spacing to prevent text overlap
      const startX = (req.artificialStartTime / maxDuration) * timelineWidth
      const width = Math.max((req.duration / maxDuration) * timelineWidth, 2) // Minimum 2px width

      return {
        x: startX,
        y: index * rowHeight,
        width: width,
        height: 8, // Much thinner bars
        color: req.type === 'fetch' ? '#10B981' : req.type === 'script' ? '#3B82F6' : '#6B7280',
        request: req,
        label: req.name ? req.name.split('/').pop() : `Request ${index + 1}`,
        index: index
      }
    })

    return { bars, maxDuration, startTime: 0, requestsWithTimeline }
  }, [processedRequests, correlatedItems, selectedCorrelation])

  // Draw the waterfall chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size with adequate space for all requests
    const dpr = window.devicePixelRatio || 1
    const displayWidth = 800
    const displayHeight = Math.max(height, chartData.bars.length * 35 + 120) // Updated for new row height

    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr
    canvas.style.width = displayWidth + 'px'
    canvas.style.height = displayHeight + 'px'

    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, displayWidth, displayHeight)

    // Draw grid lines
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 1

    // Vertical grid lines (time markers)
    const timeMarkers = 5
    const timelineStartX = 250 // Match where bars start
    const timelineWidth = displayWidth - timelineStartX - 40

    for (let i = 0; i <= timeMarkers; i++) {
      const x = timelineStartX + (i / timeMarkers) * timelineWidth
      ctx.beginPath()
      ctx.moveTo(x, 60) // Start grid lines below time labels
      ctx.lineTo(x, displayHeight - 40)
      ctx.stroke()

      // Time labels
      const timeMs = (i / timeMarkers) * chartData.maxDuration
      ctx.fillStyle = '#6B7280'
      ctx.font = '12px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.round(timeMs)}ms`, x, 35)
    }

    // Draw waterfall bars
    console.log('Drawing bars:', chartData.bars.length, 'bars')

    chartData.bars.forEach((bar, index) => {
      const adjustedY = bar.y + 60 // Offset all bars down to align with grid

      // Highlight hovered bar
      if (hoveredIndex === index) {
        ctx.fillStyle = '#F3F4F6'
        ctx.fillRect(0, adjustedY - 2, displayWidth, 35)
      }

      // Highlight selected bar
      if (selectedRequestIndex === index) {
        ctx.fillStyle = '#DBEAFE'
        ctx.fillRect(0, adjustedY - 2, displayWidth, 35)
      }

      // Draw thin timing bars without borders
      const barX = 250 + bar.x // Bar position relative to timeline start
      const barWidth = Math.max(20, bar.width) // Minimum 20px width for visibility
      const barHeight = 8 // Thin bars
      const barY = adjustedY + 12 // Centered in larger row, using adjusted Y

      // Draw the main timing bar - no background, no borders
      ctx.fillStyle = bar.color
      ctx.fillRect(barX, barY, barWidth, barHeight)

      // Correlation indicator removed to avoid borders

      // Add error indicator
      if (bar.isErrorRelated) {
        ctx.fillStyle = '#DC2626'
        ctx.beginPath()
        ctx.arc(barX - 8, barY + barHeight/2, 4, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Draw request label (URL or name)
      ctx.fillStyle = '#374151'
      ctx.font = '12px system-ui'
      ctx.textAlign = 'left'
      const url = bar.request.url || bar.request.name || 'Unknown Request'
      // Extract filename from URL for better readability
      const urlParts = url.split('/')
      const filename = urlParts[urlParts.length - 1] || url
      const label = filename.length > 25 ? filename.substring(0, 25) + '...' : filename
      ctx.fillText(label, 10, adjustedY + 16)

      // Show method if available
      if (bar.request.method) {
        ctx.fillStyle = '#9CA3AF'
        ctx.font = '10px system-ui'
        ctx.fillText(bar.request.method, 10, adjustedY + 28)
      }

      // Draw duration and size info
      ctx.fillStyle = '#6B7280'
      ctx.font = '11px system-ui'
      ctx.textAlign = 'right'
      const duration = `${bar.request.duration || bar.request.response_time || bar.request.responseTime || 0}ms`
      const size = bar.request.size ? ` | ${formatBytes(bar.request.size)}` : ''
      ctx.fillText(duration + size, 230, adjustedY + 16)
    })

    // Draw title and description
    // Timeline title removed to prevent overlapping

    // Draw legends
    drawLegend(ctx, displayWidth, displayHeight)

  }, [chartData, hoveredIndex, selectedRequestIndex, height])

  // Handle mouse events for interactivity
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Find hovered bar (accounting for vertical offset)
    const hoveredBar = chartData.bars.find((bar, index) => {
      const adjustedY = bar.y + 60
      return y >= adjustedY && y <= adjustedY + 35
    })

    if (hoveredBar) {
      setHoveredIndex(hoveredBar.index)

      // Show tooltip
      const request = hoveredBar.request
      const duration = request.duration || request.response_time || request.responseTime || 0
      const tooltipContent = `
        ${request.name || request.url || 'Network Request'}
        Duration: ${duration}ms
        Status: ${request.status || 'N/A'}
        Size: ${request.size ? formatBytes(request.size) : 'N/A'}
        ${request.method ? `Method: ${request.method}` : ''}
      `.trim()

      setTooltip({
        visible: true,
        x: event.clientX + 10,
        y: event.clientY - 10,
        content: tooltipContent
      })
    } else {
      setHoveredIndex(null)
      setTooltip(prev => ({ ...prev, visible: false }))
    }
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
    setTooltip(prev => ({ ...prev, visible: false }))
  }

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onRequestClick) return

    const hoveredBar = chartData.bars.find((bar) => {
      return hoveredIndex === bar.index
    })

    if (hoveredBar) {
      onRequestClick(hoveredBar.request, hoveredBar.index)
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`} data-testid="network-waterfall">
      {/* Header with controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Network Waterfall</h3>
          <div className="text-sm text-gray-500">
            {processedRequests.length} request{processedRequests.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search filter */}
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter requests..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              data-testid="request-filter"
            />
          </div>

          {/* Sort controls */}
          <div className="flex items-center space-x-2">
            <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="sort-select"
            >
              <option value="startTime">Start Time</option>
              <option value="duration">Duration</option>
              <option value="size">Size</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
              data-testid="sort-direction"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="p-4">
        {processedRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-500" data-testid="empty-waterfall-state">
            <WifiIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No network requests to display</p>
            {filter && <p className="text-sm mt-2">Try adjusting your filter</p>}
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
              className="cursor-pointer"
              data-testid="waterfall-canvas"
            />
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded px-3 py-2 max-w-xs pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
          data-testid="request-tooltip"
        >
          <pre className="whitespace-pre-wrap">{tooltip.content}</pre>
        </div>
      )}

      {/* Correlation indicators */}
      {correlatedItems.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center space-x-2 text-sm text-amber-600">
            <LinkIcon className="w-4 h-4" />
            <span data-testid="correlation-indicator">
              {correlatedItems.length} correlated request{correlatedItems.length !== 1 ? 's' : ''} highlighted
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to draw legend
function drawLegend(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const legendItems = [
    { color: '#3B82F6', label: 'Normal' },
    { color: '#F59E0B', label: 'Correlated' },
    { color: '#EF4444', label: 'Error Related' },
    { color: '#DC2626', label: 'HTTP Error' },
    { color: '#7C2D12', label: 'Slow (>1s)' }
  ]

  const legendY = height - 25
  let legendX = 10

  ctx.font = '12px system-ui'
  ctx.textAlign = 'left'

  legendItems.forEach(item => {
    // Draw color square
    ctx.fillStyle = item.color
    ctx.fillRect(legendX, legendY, 12, 12)

    // Draw label
    ctx.fillStyle = '#374151'
    ctx.fillText(item.label, legendX + 18, legendY + 10)

    legendX += ctx.measureText(item.label).width + 40
  })
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}