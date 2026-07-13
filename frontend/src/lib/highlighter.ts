import { getHighlighter, type Highlighter } from 'shiki'

let highlighter: Highlighter | null = null
let initPromise: Promise<Highlighter> | null = null

export const LANGUAGES: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  php: 'php',
  css: 'css',
  scss: 'scss',
  html: 'html',
  xml: 'xml',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  ps1: 'powershell',
  ps: 'powershell',
  dockerfile: 'dockerfile',
  diff: 'diff',
  graphql: 'graphql',
  svelte: 'svelte',
  vue: 'vue',
  c: 'c',
  cpp: 'cpp',
  cs: 'csharp',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
  scala: 'scala',
  toml: 'toml',
  ini: 'ini',
  tex: 'latex',
  txt: 'text',
}

export const THEMES: Record<string, string> = {
  dark: 'github-dark',
  light: 'github-light',
}

function getDefaultLangs(): string[] {
  const langSet = new Set<string>()
  Object.values(LANGUAGES).forEach((l) => langSet.add(l))
  return Array.from(langSet)
}

export async function getHighlighterInstance(): Promise<Highlighter> {
  if (highlighter) return highlighter
  if (initPromise) return initPromise

  initPromise = getHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: getDefaultLangs(),
  }).then((h) => {
    highlighter = h
    return h
  })

  return initPromise
}

export function detectLanguage(filename: string, mimeType?: string): string {
  // Try to detect from MIME type first
  if (mimeType) {
    if (mimeType === 'text/html') return 'html'
    if (mimeType === 'text/css') return 'css'
    if (mimeType === 'text/javascript') return 'javascript'
    if (mimeType === 'application/json') return 'json'
    if (mimeType === 'text/xml' || mimeType === 'application/xml') return 'xml'
    if (mimeType === 'text/markdown') return 'markdown'
    if (mimeType === 'text/x-yaml') return 'yaml'
    if (mimeType === 'text/x-sql') return 'sql'
    if (mimeType === 'text/x-php') return 'php'
    if (mimeType === 'text/x-python') return 'python'
  }

  // Try to detect from file extension
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext) {
    // Handle special cases like Dockerfile, Makefile
    if (filename === 'Dockerfile' || filename.endsWith('.Dockerfile')) return 'dockerfile'
    if (filename === 'Makefile') return 'make'
    if (filename === '.env') return 'ini'

    const cleanExt = ext.replace(/\.(min|prod|dev)$/, '')
    const lang = LANGUAGES[cleanExt]
    if (lang) return lang
  }

  return 'text'
}
