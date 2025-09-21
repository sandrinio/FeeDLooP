/**
 * T081: File attachment display component
 * Reusable component for displaying and managing file attachments
 */

'use client'

import { useState } from 'react'
import {
  PaperClipIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  CodeBracketIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline'

interface Attachment {
  id: string
  filename: string
  file_size: number
  mime_type: string
  file_url?: string
  created_at: string
}

interface AttachmentListProps {
  attachments: Attachment[]
  onDownload?: (attachment: Attachment) => void
  onPreview?: (attachment: Attachment) => void
  onDelete?: (attachmentId: string) => void
  showDeleteButton?: boolean
  showPreview?: boolean
  compact?: boolean
  maxDisplayCount?: number
}

export default function AttachmentList({
  attachments,
  onDownload,
  onPreview,
  onDelete,
  showDeleteButton = false,
  showPreview = true,
  compact = false,
  maxDisplayCount
}: AttachmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string, fileName: string) => {
    const iconClass = compact ? "h-4 w-4" : "h-5 w-5"

    // Image files
    if (mimeType.startsWith('image/')) {
      return <PhotoIcon className={`${iconClass} text-green-500`} />
    }

    // Video files
    if (mimeType.startsWith('video/')) {
      return <VideoCameraIcon className={`${iconClass} text-purple-500`} />
    }

    // Audio files
    if (mimeType.startsWith('audio/')) {
      return <SpeakerWaveIcon className={`${iconClass} text-blue-500`} />
    }

    // Code files
    if (mimeType.includes('javascript') || mimeType.includes('json') ||
        fileName.match(/\.(js|ts|jsx|tsx|json|css|html|xml|yaml|yml)$/i)) {
      return <CodeBracketIcon className={`${iconClass} text-yellow-500`} />
    }

    // Archive files
    if (mimeType.includes('zip') || mimeType.includes('rar') ||
        fileName.match(/\.(zip|rar|7z|tar|gz)$/i)) {
      return <ArchiveBoxIcon className={`${iconClass} text-orange-500`} />
    }

    // Default document icon
    return <DocumentIcon className={`${iconClass} text-gray-500`} />
  }

  const isPreviewable = (mimeType: string, fileName: string) => {
    return mimeType.startsWith('image/') ||
           mimeType === 'application/pdf' ||
           mimeType.startsWith('text/') ||
           fileName.match(/\.(txt|md|json|xml|csv)$/i)
  }

  const handleDownload = (attachment: Attachment) => {
    if (onDownload) {
      onDownload(attachment)
    } else if (attachment.file_url) {
      // Default download behavior
      const link = document.createElement('a')
      link.href = attachment.file_url
      link.download = attachment.filename
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handlePreview = (attachment: Attachment) => {
    if (onPreview) {
      onPreview(attachment)
    } else if (attachment.file_url) {
      // Default preview behavior - open in new tab
      window.open(attachment.file_url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!onDelete) return

    if (!confirm('Are you sure you want to delete this attachment?')) {
      return
    }

    setDeletingId(attachmentId)
    try {
      await onDelete(attachmentId)
    } catch (err) {
      console.error('Failed to delete attachment:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const displayAttachments = maxDisplayCount
    ? attachments.slice(0, maxDisplayCount)
    : attachments

  const remainingCount = maxDisplayCount && attachments.length > maxDisplayCount
    ? attachments.length - maxDisplayCount
    : 0

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8">
        <PaperClipIcon className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No attachments</h3>
        <p className="mt-1 text-sm text-gray-500">
          No files have been attached to this report.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayAttachments.map((attachment) => (
        <div
          key={attachment.id}
          className={`flex items-center justify-between border border-gray-200 rounded-lg ${
            compact ? 'p-2' : 'p-3'
          } hover:border-gray-300 transition-colors`}
        >
          <div className="flex items-center min-w-0 flex-1">
            <div className={`flex-shrink-0 ${compact ? 'mr-2' : 'mr-3'}`}>
              {getFileIcon(attachment.mime_type, attachment.filename)}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : 'text-sm'}`}>
                {attachment.filename}
              </p>
              <div className={`flex items-center space-x-2 ${compact ? 'text-xs' : 'text-xs'} text-gray-500`}>
                <span>{formatFileSize(attachment.file_size)}</span>
                <span>•</span>
                <span>{attachment.mime_type}</span>
                {!compact && (
                  <>
                    <span>•</span>
                    <span>{new Date(attachment.created_at).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 ml-2">
            {/* Preview Button */}
            {showPreview && isPreviewable(attachment.mime_type, attachment.filename) && (
              <button
                onClick={() => handlePreview(attachment)}
                className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                title="Preview file"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            )}

            {/* Download Button */}
            {attachment.file_url && (
              <button
                onClick={() => handleDownload(attachment)}
                className="p-1 text-gray-400 hover:text-green-600 rounded transition-colors"
                title="Download file"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
            )}

            {/* Delete Button */}
            {showDeleteButton && onDelete && (
              <button
                onClick={() => handleDelete(attachment.id)}
                disabled={deletingId === attachment.id}
                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                title="Delete attachment"
              >
                {deletingId === attachment.id ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Show remaining count */}
      {remainingCount > 0 && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">
            +{remainingCount} more attachment{remainingCount > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Summary */}
      {!compact && attachments.length > 1 && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{attachments.length} file{attachments.length > 1 ? 's' : ''}</span>
            <span>
              Total: {formatFileSize(
                attachments.reduce((total, att) => total + att.file_size, 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}