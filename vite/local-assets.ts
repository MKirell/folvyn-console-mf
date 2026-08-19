import { existsSync, mkdirSync } from 'node:fs'
import { readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import type { ServerResponse } from 'node:http'

export const LOCAL_ASSETS_ROUTE = '/__local-assets'

const FOLDERS = ['imgs', 'files'] as const
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg'])
const KEY_PATTERN = /^[a-z0-9_-]+\.[a-z0-9]{2,5}$/i
const MAX_BYTES = 10 * 1024 * 1024

interface LocalAsset {
  key: string
  size: number
  lastModified: string
}

function folderFor(key: string): (typeof FOLDERS)[number] {
  const extension = key.slice(key.lastIndexOf('.') + 1).toLowerCase()
  return IMAGE_EXTENSIONS.has(extension) ? 'imgs' : 'files'
}

function keyFrom(url: string): string {
  const [path] = url.split('?')
  return decodeURIComponent(path.slice(LOCAL_ASSETS_ROUTE.length).replace(/^\/+/, ''))
}

function send(response: ServerResponse, status: number, body?: unknown): void {
  if (body === undefined) {
    response.statusCode = status
    response.end()
    return
  }

  const payload = JSON.stringify(body)
  response.statusCode = status
  response.setHeader('content-type', 'application/json')
  response.setHeader('cache-control', 'no-store')
  response.end(payload)
}

async function readBody(request: Connect.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > MAX_BYTES) throw new Error('That file is larger than 10 MB')
    chunks.push(buffer)
  }

  return Buffer.concat(chunks)
}

async function list(root: string): Promise<LocalAsset[]> {
  const found: LocalAsset[] = []

  for (const folder of FOLDERS) {
    const directory = join(root, folder)
    if (!existsSync(directory)) continue

    for (const entry of await readdir(directory)) {
      const stats = await stat(join(directory, entry))
      if (!stats.isFile()) continue
      found.push({
        key: entry,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      })
    }
  }

  return found.sort((a, b) => a.key.localeCompare(b.key))
}

export function localAssets(directory?: string): Plugin {
  const root = resolve(directory ?? process.env.LOCAL_ASSETS_DIR ?? '../folvyn-portfolio-mf/public')

  return {
    name: 'folvyn-local-assets',
    apply: 'serve',

    configureServer(server: ViteDevServer) {
      server.middlewares.use(LOCAL_ASSETS_ROUTE, async (request, response, next) => {
        const url = `${LOCAL_ASSETS_ROUTE}${request.url ?? '/'}`

        try {
          if (request.method === 'GET') {
            if (!existsSync(root)) return send(response, 200, { root, assets: [] })
            return send(response, 200, { root, assets: await list(root) })
          }

          const key = keyFrom(url)
          if (!KEY_PATTERN.test(key)) {
            return send(response, 400, { message: `"${key}" is not an accepted filename` })
          }

          const target = join(root, folderFor(key), key)

          if (request.method === 'PUT') {
            mkdirSync(join(root, folderFor(key)), { recursive: true })
            await writeFile(target, await readBody(request))
            const stats = await stat(target)
            return send(response, 200, {
              key,
              size: stats.size,
              lastModified: stats.mtime.toISOString(),
            })
          }

          if (request.method === 'DELETE') {
            await rm(target, { force: true })
            return send(response, 204)
          }

          return next()
        } catch (cause) {
          server.config.logger.error(`[local-assets] ${String(cause)}`)
          return send(response, 500, {
            message: cause instanceof Error ? cause.message : 'The local asset write failed',
          })
        }
      })
    },
  }
}
