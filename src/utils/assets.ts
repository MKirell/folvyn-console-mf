import { ASSETS_BASE_URL } from '@/config/env'
import type { AssetKind } from '@/registry/collections'

export const KEY_PATTERN = /^([a-z0-9-]+\/)?[a-z0-9_-]+\.[a-z]{3,4}$/

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg']

export const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export function extensionOf(key: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(key)
  return match ? match[1].toLowerCase() : ''
}

export function isImageKey(key: string): boolean {
  return IMAGE_EXTENSIONS.includes(extensionOf(key))
}

export function contentTypeOf(filename: string): string | undefined {
  return CONTENT_TYPES[extensionOf(filename)]
}

export function matchesKind(key: string, kind: AssetKind | undefined): boolean {
  if (!kind) return true
  return kind === 'pdf' ? extensionOf(key) === 'pdf' : isImageKey(key)
}

let ownerPrefix = ''

export function setAssetPrefix(prefix: string): void {
  ownerPrefix = prefix.replace(/^\/+|\/+$/g, '')
}

export function assetPrefix(): string {
  return ownerPrefix
}

function assetPath(folder: string, key: string): string {
  const owner = ownerPrefix ? `${ownerPrefix}/` : ''
  return `${ASSETS_BASE_URL}/${folder}/${owner}${key}`
}

export function docUrl(key: string | null | undefined): string | undefined {
  return key ? assetPath('files', key) : undefined
}

export function imgUrl(key: string | null | undefined): string | undefined {
  return key ? assetPath('imgs', key) : undefined
}

export function isPdfKey(key: string): boolean {
  return extensionOf(key) === 'pdf'
}

export function assetUrl(key: string): string | undefined {
  return isPdfKey(key) ? docUrl(key) : imgUrl(key)
}

export function openUrl(key: string): string | undefined {
  const url = assetUrl(key)
  if (!url) return undefined
  return isPdfKey(key) ? `${url}#view=FitV&toolbar=1` : url
}

export function pdfPreviewUrl(key: string): string | undefined {
  const url = docUrl(key)
  return url ? `${url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0` : undefined
}

export function sanitizeFilename(filename: string): string {
  const dot = filename.lastIndexOf('.')
  const stem = dot > 0 ? filename.slice(0, dot) : filename
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : ''

  const cleanStem = stem
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

  return ext ? `${cleanStem}.${ext}` : cleanStem
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
