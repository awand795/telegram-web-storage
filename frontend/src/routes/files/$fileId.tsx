import React from 'react'
import { createRoute, useParams, Link } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useFile, useDeleteFile, useGenerateShareLink, useRevokeShareLink } from '@/queries'
import { formatBytes, relativeTime } from '@/lib/utils'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Share2, Link2, Link2Off, Trash2, Check, Copy } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/files/$fileId',
  component: FileDetailPage,
})

function FileDetailPage() {
  const { fileId } = useParams({ from: Route.id })
  const { data: file, isLoading } = useFile(fileId)
  const deleteFile = useDeleteFile()
  const generateShare = useGenerateShareLink()
  const revokeShare = useRevokeShareLink()
  const [shareUrl, setShareUrl] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  // Pre-populate share link from existing token when file loads
  React.useEffect(() => {
    if (file?.share_token) {
      setShareUrl(window.location.origin + '/s/' + file.share_token)
    }
  }, [file?.share_token])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-text-muted">Loading file details...</p>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-text-muted">File not found</p>
        <Link to="/files" className="text-sm text-accent-primary hover:underline">
          Back to files
        </Link>
      </div>
    )
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return
    await deleteFile.mutateAsync(file.id)
    toast.success('File deleted')
  }

  const handleShare = async () => {
    if (shareUrl) {
      // Already shared — copy link
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
      return
    }

    try {
      const result = await generateShare.mutateAsync(file.id)
      const url = result.share_url
      setShareUrl(url)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Share link generated and copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to generate share link'
      toast.error(msg)
    }
  }

  const handleRevoke = async () => {
    if (!window.confirm('Revoke share link? The current link will stop working.')) return
    await revokeShare.mutateAsync(file.id)
    setShareUrl(null)
    toast.success('Share link revoked')
  }

  const isImage = file.mime_type.startsWith('image/')
  const isVideo = file.mime_type.startsWith('video/')
  const isPdf = file.mime_type === 'application/pdf'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link to="/files" className="hover:text-accent-primary">
          Files
        </Link>
        <span>/</span>
        <span className="text-text-secondary">{file.name}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 overflow-hidden rounded-xl border border-border-default bg-surface"
        >
          {isImage ? (
            <img
              src={`/api/v1/files/${file.id}/download`}
              alt={file.name}
              className="h-full w-full object-contain"
            />
          ) : isVideo ? (
            <video
              controls
              src={`/api/v1/files/${file.id}/download`}
              className="h-full w-full"
            />
          ) : isPdf ? (
            <iframe
              src={`/api/v1/files/${file.id}/download`}
              className="h-[600px] w-full"
            />
          ) : (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <p className="text-4xl text-text-muted">📄</p>
                <p className="mt-2 text-sm text-text-muted">Preview not available</p>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-border-default bg-surface p-4">
            <h2 className="mb-3 text-sm font-medium text-text-secondary">File Info</h2>
            <div className="space-y-3">
              {[
                { label: 'Name', value: file.name },
                { label: 'Size', value: formatBytes(file.size) },
                { label: 'Type', value: file.mime_type },
                { label: 'Status', value: file.status },
                { label: 'Uploaded', value: relativeTime(file.uploaded_at) },
                { label: 'Bot ID', value: file.bot_id },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    {field.label}
                  </p>
                  <p className="mt-0.5 text-sm text-text-primary">{field.value}</p>
                </div>
              ))}
            </div>
          </div>

          {file.tags.length > 0 && (
            <div className="rounded-xl border border-border-default bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text-secondary">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {file.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share Section */}
          <div className="rounded-xl border border-border-default bg-surface p-4">
            <h2 className="mb-3 text-sm font-medium text-text-secondary">Share</h2>
            {shareUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-zinc-800/50 px-3 py-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-accent-primary" />
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-transparent text-xs text-text-muted truncate focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleShare}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-primary/10 px-3 py-2 text-xs font-medium text-accent-primary hover:bg-accent-primary/20 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={handleRevoke}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-danger/30 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
                  >
                    <Link2Off className="h-3.5 w-3.5" />
                    Revoke
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleShare}
                disabled={file.status !== 'done'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 disabled:opacity-40 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                {file.status === 'done' ? 'Create Share Link' : 'File not ready'}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <a
              href={`/api/v1/files/${file.id}/download`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90"
            >
              Download
            </a>
            <button
              onClick={handleDelete}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
