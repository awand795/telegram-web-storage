import { createRoute, useParams } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useSharedFile } from '@/queries'
import { formatBytes } from '@/lib/utils'
import { motion } from 'motion/react'
import { Download, AlertCircle, FileQuestion } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/$shareToken',
  component: SharedFilePage,
})

const FILE_ICONS: Record<string, string> = {
  'image/': '🖼',
  'video/': '🎬',
  'audio/': '🎵',
  'application/pdf': '📄',
  'application/zip': '📦',
  'application/x-rar-compressed': '📦',
  'application/x-7z-compressed': '📦',
  'text/': '📝',
}

function getFileIcon(mime: string): string {
  for (const [prefix, icon] of Object.entries(FILE_ICONS)) {
    if (mime.startsWith(prefix)) return icon
  }
  return '📁'
}

function SharedFilePage() {
  const { shareToken } = useParams({ from: Route.id })
  const { data: file, isLoading, isError } = useSharedFile(shareToken)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          <p className="mt-4 text-sm text-text-muted">Loading file info...</p>
        </div>
      </div>
    )
  }

  if (isError || !file) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
            <FileQuestion className="h-8 w-8 text-text-muted" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Link Not Found</h1>
          <p className="mt-2 text-sm text-text-muted">
            This file link is invalid or has been removed.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-warning">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Contact the file owner for a new link</span>
          </div>
        </motion.div>
      </div>
    )
  }

  const downloadUrl = `/s/${shareToken}/download`
  const uploadedDate = file.uploaded_at
    ? new Date(file.uploaded_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown date'

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-border-default bg-surface shadow-xl shadow-black/5">
          {/* Top accent gradient */}
          <div className="h-1.5 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary" />

          {/* File Icon & Name */}
          <div className="px-6 pt-8 pb-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-elevated text-4xl"
            >
              {getFileIcon(file.mime_type)}
            </motion.div>

            <h1 className="break-all px-2 text-lg font-semibold text-text-primary">
              {file.name}
            </h1>
          </div>

          {/* File Info */}
          <div className="border-t border-border-default px-6 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Size</span>
              <span className="font-medium text-text-primary">{formatBytes(file.size)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-text-muted">Type</span>
              <span className="font-medium text-text-primary">{file.mime_type}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-text-muted">Uploaded</span>
              <span className="font-medium text-text-primary">{uploadedDate}</span>
            </div>
          </div>

          {/* Download Button */}
          <div className="border-t border-border-default px-6 py-5">
            <a
              href={downloadUrl}
              className="group flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent-primary/25 transition-all hover:shadow-accent-primary/40 active:scale-[0.98]"
            >
              <Download className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
              Download File
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-muted">
          Powered by{' '}
          <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text font-semibold text-transparent">
            TeleStore
          </span>
        </p>
      </motion.div>
    </div>
  )
}
