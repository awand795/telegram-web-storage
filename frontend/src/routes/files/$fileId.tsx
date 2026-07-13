import React, { useEffect, useState } from 'react'
import { createRoute, useParams, Link } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useFile, useDeleteFile, useFileContent, useGenerateShareLink, useRevokeShareLink } from '@/queries'
import { formatBytes, relativeTime } from '@/lib/utils'
import { getHighlighterInstance, detectLanguage } from '@/lib/highlighter'
import { useThemeStore } from '@/stores/themeStore'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  Share2, Link2, Link2Off, Trash2, Check, Copy, Download,
  FileCode, Music, Loader2, AlertCircle,
} from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/files/$fileId',
  component: FileDetailPage,
})

// ─── Text/code file extensions ───
const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'json', 'xml', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf',
  'env', 'log', 'csv', 'tsv',
  'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift',
  'php', 'css', 'scss', 'sass', 'less', 'html', 'htm', 'vue', 'svelte',
  'sql', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd',
  'c', 'cpp', 'cxx', 'h', 'hpp', 'cs', 'dart', 'lua', 'r', 'scala', 'groovy',
  'gradle', 'makefile', 'dockerfile', 'cmake', 'rake',
  'graphql', 'gql', 'proto', 'patch', 'diff',
])

function isTextFile(filename: string, mimeType: string): boolean {
  if (mimeType.startsWith('text/')) return true
  if (mimeType === 'application/json') return true
  if (mimeType === 'application/xml') return true
  if (mimeType === 'application/x-yaml') return true
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext) {
    if (filename === 'Dockerfile' || filename.endsWith('.Dockerfile')) return true
    if (filename === 'Makefile' || filename === 'makefile') return true
    if (filename === '.env') return true
    if (TEXT_EXTENSIONS.has(ext)) return true
  }
  return false
}

function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/')
}

// ─── Code Preview Component ───
function CodePreview({ code, lang, filename }: { code: string; lang: string; filename: string }) {
  const { theme } = useThemeStore()
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function highlight() {
      try {
        const shikiLang = detectLanguage(filename, lang)
        const highlighter = await getHighlighterInstance()
        if (cancelled) return
        const shikiTheme = theme === 'light' ? 'github-light' : 'github-dark'
        const out = highlighter.codeToHtml(code, {
          lang: shikiLang,
          theme: shikiTheme,
        })
        if (!cancelled) setHtml(out)
      } catch (e) {
        if (!cancelled) {
          setError('Failed to highlight code')
        }
      }
    }
    highlight()
    return () => { cancelled = true }
  }, [code, lang, theme])

  if (error) {
    return (
      <pre className="overflow-x-auto p-4 text-sm text-text-primary">
        <code>{code}</code>
      </pre>
    )
  }

  return (
    <div className="relative">
      {!html && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
        </div>
      )}
      {html && (
        <div
          className="overflow-x-auto text-sm leading-relaxed [&>pre]:!bg-transparent [&>pre]:p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  )
}

// ─── Main Page ───
function FileDetailPage() {
  const { fileId } = useParams({ from: Route.id })
  const { data: file, isLoading } = useFile(fileId)
  const deleteFile = useDeleteFile()
  const generateShare = useGenerateShareLink()
  const revokeShare = useRevokeShareLink()
  const [shareUrl, setShareUrl] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  // Determine if this file can be previewed as text/code
  const canPreviewText = file && isTextFile(file.name, file.mime_type)
  const canPreviewAudio = file && isAudioFile(file.mime_type)

  // Only fetch content if we can preview it as text
  const { data: fileContent, isLoading: contentLoading, isError: contentError } = useFileContent(
    fileId,
    canPreviewText ?? false,
  )

  // Pre-populate share link
  useEffect(() => {
    if (file?.share_token) {
      setShareUrl(window.location.origin + '/s/' + file.share_token)
    }
  }, [file?.share_token])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
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

  const downloadUrl = `/api/v1/files/${file.id}/download`

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return
    await deleteFile.mutateAsync(file.id)
    toast.success('File deleted')
  }

  const handleShare = async () => {
    if (shareUrl) {
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

  // Get file extension for display
  const fileExt = file.name.split('.').pop()?.toLowerCase() || ''

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link to="/files" className="hover:text-accent-primary transition-colors">
          Files
        </Link>
        <span>/</span>
        <span className="text-text-secondary truncate max-w-[300px]">{file.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Preview Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border border-border-default bg-surface xl:col-span-2"
        >
          {/* Previews in priority order: Image > Video > Audio > PDF > Code/Text > None */}
          {isImage ? (
            <img
              src={downloadUrl}
              alt={file.name}
              className="h-full max-h-[600px] w-full object-contain"
            />
          ) : isVideo ? (
            <video
              controls
              src={downloadUrl}
              className="w-full max-h-[600px]"
            >
              Your browser does not support video playback.
            </video>
          ) : canPreviewAudio ? (
            <div className="flex flex-col items-center justify-center px-6 py-16">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-accent-primary/10">
                <Music className="h-10 w-10 text-accent-primary animate-pulse" />
              </div>
              <p className="mb-1 text-sm font-medium text-text-primary">{file.name}</p>
              <p className="mb-6 text-xs text-text-muted">{formatBytes(file.size)}</p>
              <audio
                controls
                src={downloadUrl}
                className="w-full max-w-md"
                style={{ height: '48px' }}
              >
                Your browser does not support audio playback.
              </audio>
            </div>
          ) : isPdf ? (
            <iframe
              src={downloadUrl}
              className="h-[600px] w-full"
              title={file.name}
            />
          ) : canPreviewText ? (
            <div className="flex flex-col">
              {/* File info bar */}
              <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
                <FileCode className="h-4 w-4 text-accent-primary" />
                <span className="text-xs font-medium text-text-secondary uppercase">
                  {fileExt || 'text'}
                </span>
                {contentLoading && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
                    <span className="text-[10px] text-text-muted">Loading content...</span>
                  </div>
                )}
                {contentError && (
                  <div className="flex items-center gap-1.5 ml-auto text-warning">
                    <AlertCircle className="h-3 w-3" />
                    <span className="text-[10px]">Could not load file content</span>
                  </div>
                )}
              </div>
              {/* Code/content display */}
              {contentLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
                </div>
              ) : contentError ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted">
                  <AlertCircle className="h-8 w-8" />
                  <p className="text-sm">Unable to preview this file's content</p>
                  <a
                    href={downloadUrl}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-xs font-medium text-white hover:bg-accent-primary/90 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download to view
                  </a>
                </div>
              ) : fileContent ? (
                <div className="max-h-[600px] overflow-auto">
                  <CodePreview code={fileContent} lang={file.mime_type} filename={file.name} />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <p className="text-5xl text-text-muted">📄</p>
                <p className="mt-3 text-sm text-text-muted">Preview not available for this file type</p>
                <a
                  href={downloadUrl}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            </div>
          )}
        </motion.div>

        {/* Sidebar Info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* File Info */}
          <div className="rounded-xl border border-border-default bg-surface p-4">
            <h2 className="mb-3 text-sm font-medium text-text-secondary">File Info</h2>
            <div className="space-y-3">
              {[
                { label: 'Name', value: file.name },
                { label: 'Size', value: formatBytes(file.size) },
                { label: 'Type', value: file.mime_type },
                { label: 'Status', value: file.status },
                { label: 'Uploaded', value: relativeTime(file.uploaded_at) },
                { label: 'Bot ID', value: file.bot_id.slice(0, 12) + '...' },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    {field.label}
                  </p>
                  <p className="mt-0.5 text-sm text-text-primary break-all">{field.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
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
                <div className="flex items-center gap-2 rounded-lg bg-surface-elevated px-3 py-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-accent-primary" />
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-transparent text-xs text-text-muted truncate focus:outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
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

          {/* Actions */}
          <div className="flex gap-2">
            <a
              href={downloadUrl}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
            <button
              onClick={handleDelete}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
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
