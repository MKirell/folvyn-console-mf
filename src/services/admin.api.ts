import { API_BASE_URL, API_TIMEOUT_MS } from '@/config/env'
import type {
  AdminDocument,
  AdminLocale,
  ApiErrorBody,
  AssetObject,
  ConsentMode,
  HealthBody,
  PresignRequest,
  PresignResponse,
  OwnerRecord,
  ReorderEntry,
  SlugAvailability,
} from '@/types/admin'
import type {
  AnalyticsSummary,
  AuditEntry,
  PlatformHealth,
  PlatformOverview,
  PortfolioRow,
  AccountDetail,
  ModerationBoard,
  IngestReport,
  PlatformConfig,
  ErasureRow,
} from '@/types/analytics'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly messages: string[] = [],
    readonly body: ApiErrorBody | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isValidation(): boolean {
    return this.status === 400 || this.status === 422
  }
}

type TokenProvider = () => Promise<string | null>
type UnauthorizedHandler = () => Promise<boolean>
type ForbiddenHandler = (message: string) => void

let provideToken: TokenProvider = () => Promise.resolve(null)
let handleUnauthorized: UnauthorizedHandler = () => Promise.resolve(false)
let handleForbidden: ForbiddenHandler = () => {}

export function setTokenProvider(provider: TokenProvider): void {
  provideToken = provider
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  handleUnauthorized = handler
}

export function setForbiddenHandler(handler: ForbiddenHandler): void {
  handleForbidden = handler
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

function toMessages(body: ApiErrorBody | null, fallback: string): string[] {
  if (!body) return [fallback]
  return Array.isArray(body.message) ? body.message : [body.message]
}

async function send<T>(path: string, options: RequestOptions): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  options.signal?.addEventListener('abort', () => controller.abort())

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = await provideToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    if (response.status === 204) return undefined as T
    if (response.ok) return (await response.json()) as T

    const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null
    const messages = toMessages(errorBody, `${path} responded ${response.status}`)
    throw new ApiError(messages[0], response.status, messages, errorBody)
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(`${path} timed out after ${API_TIMEOUT_MS}ms`, 0)
    }
    throw new ApiError(error instanceof Error ? error.message : `${path} failed`, 0)
  } finally {
    clearTimeout(timer)
  }
}

const WAKING = [502, 503, 504]
const WAKING_ATTEMPTS = 3
const WAKING_PAUSE_MS = 1_200

function wakingUp(error: unknown, method: string): boolean {
  if (method !== 'GET') return false
  if (!(error instanceof ApiError)) return true
  return WAKING.includes(error.status)
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await send<T>(path, options)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && options.auth !== false) {
        if (await handleUnauthorized()) return send<T>(path, options)
        throw error
      }

      if (error instanceof ApiError && error.status === 403 && options.auth !== false) {
        handleForbidden(error.message)
        throw error
      }

      if (attempt >= WAKING_ATTEMPTS || options.signal?.aborted || !wakingUp(error, method)) {
        throw error
      }

      await pause(WAKING_PAUSE_MS * attempt)
    }
  }
}

export function listDocuments(path: string): Promise<AdminDocument[]> {
  return request<AdminDocument[]>(`/${path}`)
}

export function createDocument(path: string, payload: object): Promise<AdminDocument> {
  return request<AdminDocument>(`/${path}`, { method: 'POST', body: payload })
}

export function updateDocument(path: string, id: string, payload: object): Promise<AdminDocument> {
  return request<AdminDocument>(`/${path}/${id}`, { method: 'PATCH', body: payload })
}

export function deleteDocument(path: string, id: string): Promise<void> {
  return request<void>(`/${path}/${id}`, { method: 'DELETE' })
}

export function reorderDocuments(path: string, entries: ReorderEntry[]): Promise<AdminDocument[]> {
  return request<AdminDocument[]>(`/${path}/reorder`, { method: 'PATCH', body: { entries } })
}

export function fetchSingleton(path: string): Promise<AdminDocument> {
  return request<AdminDocument>(`/${path}`)
}

export function updateSingleton(path: string, payload: object): Promise<AdminDocument> {
  return request<AdminDocument>(`/${path}`, { method: 'PATCH', body: payload })
}

export function createSingleton(path: string, payload: object): Promise<AdminDocument> {
  return request<AdminDocument>(`/${path}`, { method: 'PUT', body: payload })
}

export function fetchLocales(): Promise<AdminLocale[]> {
  return request<AdminLocale[]>('/admin/locales')
}

export function presignUpload(payload: PresignRequest): Promise<PresignResponse> {
  return request<PresignResponse>('/admin/uploads/presign', { method: 'POST', body: payload })
}

export function listAssets(): Promise<AssetObject[]> {
  return request<AssetObject[]>('/admin/uploads')
}

export function deleteAsset(key: string): Promise<void> {
  return request<void>(`/admin/uploads/${encodeURIComponent(key)}`, { method: 'DELETE' })
}

export function fetchMe(): Promise<OwnerRecord> {
  return request<OwnerRecord>('/me')
}

export function publishPortfolio(): Promise<OwnerRecord> {
  return request<OwnerRecord>('/me/publish', { method: 'POST' })
}

export function unpublishPortfolio(): Promise<OwnerRecord> {
  return request<OwnerRecord>('/me/unpublish', { method: 'POST' })
}

export function fetchProposedAddress(): Promise<{ slug: string }> {
  return request<{ slug: string }>('/me/proposed-address')
}

export function updateMe(payload: {
  consentMode?: ConsentMode
  slug?: string
}): Promise<OwnerRecord> {
  return request<OwnerRecord>('/me', { method: 'PATCH', body: payload })
}

export function checkSlug(slug: string): Promise<SlugAvailability> {
  return request<SlugAvailability>(`/me/slug/${encodeURIComponent(slug)}`)
}

export function exportMe(): Promise<unknown> {
  return request<unknown>('/me/export')
}

export function eraseMe(): Promise<void> {
  return request<void>('/me', { method: 'DELETE' })
}

export function fetchAnalyticsSummary(days: number): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>(`/admin/analytics/summary?days=${days}`)
}

export function fetchPlatformOverview(days: number): Promise<PlatformOverview> {
  return request<PlatformOverview>(`/platform/overview?days=${days}`)
}

export function fetchPlatformHealth(days: number): Promise<PlatformHealth> {
  return request<PlatformHealth>(`/platform/health?days=${days}`)
}

export function fetchPortfolios(query: string, status: string): Promise<PortfolioRow[]> {
  const params = new URLSearchParams()
  if (query) params.set('query', query)
  if (status) params.set('status', status)

  const suffix = params.toString()
  return request<PortfolioRow[]>(`/platform/portfolios${suffix ? `?${suffix}` : ''}`)
}

export function suspendPortfolio(id: string, reason: string): Promise<PortfolioRow> {
  return request<PortfolioRow>(`/platform/portfolios/${id}/suspend`, {
    method: 'POST',
    body: { reason },
  })
}

export function restorePortfolio(id: string): Promise<PortfolioRow> {
  return request<PortfolioRow>(`/platform/portfolios/${id}/restore`, { method: 'POST' })
}

export function exportPortfolio(id: string): Promise<unknown> {
  return request<unknown>(`/platform/portfolios/${id}/export`)
}

export function erasePortfolio(id: string, reason: string): Promise<void> {
  return request<void>(`/platform/portfolios/${id}`, { method: 'DELETE', body: { reason } })
}

export function fetchAuditLog(limit = 50): Promise<AuditEntry[]> {
  return request<AuditEntry[]>(`/platform/audit?limit=${limit}`)
}

export function fetchHealth(): Promise<HealthBody> {
  return request<HealthBody>('/health', { auth: false })
}

export async function putToBucket(url: string, file: File): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!response.ok) {
    throw new ApiError(`Upload failed with ${response.status}`, response.status)
  }
}

export function fetchPlatformTraffic(days: number): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>(`/platform/traffic?days=${days}`)
}

export function fetchAccountDetail(id: string): Promise<AccountDetail> {
  return request<AccountDetail>(`/platform/portfolios/${id}`)
}

export function fetchModeration(): Promise<ModerationBoard> {
  return request<ModerationBoard>('/platform/moderation')
}

export function fetchIngestReport(days: number): Promise<IngestReport> {
  return request<IngestReport>(`/platform/ingest?days=${days}`)
}

export function fetchPlatformConfig(): Promise<PlatformConfig> {
  return request<PlatformConfig>('/platform/config')
}

export function fetchErasures(): Promise<ErasureRow[]> {
  return request<ErasureRow[]>('/platform/erasures')
}

export function queueErasure(id: string, reason: string): Promise<ErasureRow> {
  return request<ErasureRow>(`/platform/portfolios/${id}/erasure`, {
    method: 'POST',
    body: { reason },
  })
}

export function runErasure(id: string): Promise<ErasureRow> {
  return request<ErasureRow>(`/platform/erasures/${id}/run`, { method: 'POST' })
}
