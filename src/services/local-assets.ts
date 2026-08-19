import type { AssetObject } from '@/types/admin'

const ROUTE = '/__local-assets'

export function localAssetsEnabled(): boolean {
  return import.meta.env.DEV
}

async function fail(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null
  throw new Error(body?.message ?? `The local asset store answered ${response.status}`)
}

export async function listLocalAssets(): Promise<AssetObject[]> {
  const response = await fetch(ROUTE)
  if (!response.ok) return fail(response)

  const body = (await response.json()) as { assets: AssetObject[] }
  return body.assets
}

export async function putLocalAsset(key: string, file: File): Promise<AssetObject> {
  const response = await fetch(`${ROUTE}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  })

  if (!response.ok) return fail(response)
  return (await response.json()) as AssetObject
}

export async function deleteLocalAsset(key: string): Promise<void> {
  const response = await fetch(`${ROUTE}/${encodeURIComponent(key)}`, { method: 'DELETE' })
  if (!response.ok) await fail(response)
}
