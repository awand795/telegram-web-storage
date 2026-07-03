import { createRoute, useParams } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useSharedFile } from '@/queries'
import { formatBytes } from '@/lib/utils'
import { motion } from 'motion/react'

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-400">Loading file info...</p>
        </div>
      </div>
    )
  }

  if (isError || !file) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p className="text-6xl mb-4">🔗</p>
          <h1 className="text-xl font-semibold text-zinc-100">Link Not Found</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This file link is invalid or has been removed.
          </p>
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          {/* Top accent */}
          <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

          {/* File Icon & Name */}
          <div className="px-6 pt-8 pb-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800/80 text-4xl"
            >
              {getFileIcon(file.mime_type)}
            </motion.div>

            <h1 className="text-lg font-semibold text-zinc-100 break-all px-2">
              {file.name}
            </h1>
          </div>

          {/* File Info */}
          <div className="border-t border-zinc-800 px-6 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Size</span>
              <span className="font-medium text-zinc-200">{formatBytes(file.size)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-zinc-400">Type</span>
              <span className="font-medium text-zinc-200">{file.mime_type}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-zinc-400">Uploaded</span>
              <span className="font-medium text-zinc-200">{uploadedDate}</span>
            </div>
          </div>

          {/* Download Button */}
          <div className="border-t border-zinc-800 px-6 py-5">
            <a
              href={downloadUrl}
              className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/30 transition-all hover:from-violet-500 hover:to-purple-500 hover:shadow-purple-800/40 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download File
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-zinc-600">
          Powered by TeleStore
        </p>
      </motion.div>
    </div>
  )
}
