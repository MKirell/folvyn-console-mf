import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/services/admin.api')

const api = await import('@/services/admin.api')

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

let fetchMock: ReturnType<typeof vi.fn>

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  return { url, init }
}

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve(jsonResponse({})))
  vi.stubGlobal('fetch', fetchMock)
  api.setTokenProvider(() => Promise.resolve('token-1'))
  api.setUnauthorizedHandler(() => Promise.resolve(false))
})

describe('the owner surface', () => {
  it('reads and writes the owner record on /me', async () => {
    await api.fetchMe()
    expect(lastCall().url).toContain('/me')

    await api.updateMe({ slug: 'ada-lovelace' })
    expect(lastCall().init.method).toBe('PATCH')

    await api.publishPortfolio()
    expect(lastCall().url).toContain('/me/publish')

    await api.unpublishPortfolio()
    expect(lastCall().init.method).toBe('POST')
  })

  it('asks whether an address is free before offering it', async () => {
    await api.checkSlug('ada-lovelace')
    expect(lastCall().url).toContain('ada-lovelace')
  })

  it('exports everything and erases everything through their own routes', async () => {
    await api.exportMe()
    expect(lastCall().url).toContain('/me/export')

    fetchMock.mockResolvedValueOnce(jsonResponse(null, 204))
    await api.eraseMe()
    expect(lastCall().init.method).toBe('DELETE')
  })

  it('reads locales, singletons and assets', async () => {
    await api.fetchLocales()
    expect(lastCall().url).toContain('/locales')

    await api.fetchSingleton('person')
    await api.updateSingleton('person', { givenName: 'Ada' })
    expect(lastCall().init.method).toBe('PATCH')

    await api.listAssets()
    expect(lastCall().url).toContain('/uploads')

    fetchMock.mockResolvedValueOnce(jsonResponse(null, 204))
    await api.deleteAsset('imgs/photo.jpg')
    expect(lastCall().init.method).toBe('DELETE')
  })

  it('reads its own analytics summary for a window', async () => {
    await api.fetchAnalyticsSummary(7)
    expect(lastCall().url).toContain('7')
  })
})

describe('the operator surface', () => {
  it('reads every platform screen from its own route', async () => {
    const reads: [() => Promise<unknown>, string][] = [
      [() => api.fetchPlatformOverview(30), 'overview'],
      [() => api.fetchPlatformHealth(30), 'health'],
      [() => api.fetchPlatformTraffic(30), 'traffic'],
      [() => api.fetchModeration(), 'moderation'],
      [() => api.fetchIngestReport(30), 'ingest'],
      [() => api.fetchPlatformConfig(), 'config'],
      [() => api.fetchErasures(), 'erasures'],
      [() => api.fetchAuditLog(), 'audit'],
      [() => api.fetchAccountDetail('id-1'), 'id-1'],
    ]

    for (const [call, fragment] of reads) {
      await call()
      expect(lastCall().url, fragment).toContain(fragment)
      expect(lastCall().url).toContain('/platform/')
    }
  })

  it('carries the reason on every action that needs one', async () => {
    await api.suspendPortfolio('id-1', 'spam')
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ reason: 'spam' })

    await api.queueErasure('id-1', 'gdpr request')
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ reason: 'gdpr request' })

    fetchMock.mockResolvedValueOnce(jsonResponse(null, 204))
    await api.erasePortfolio('id-1', 'gdpr')
    expect(lastCall().init.method).toBe('DELETE')
  })

  it('restores, exports and runs an erasure by id', async () => {
    await api.restorePortfolio('id-1')
    expect(lastCall().url).toContain('id-1')

    await api.exportPortfolio('id-1')
    expect(lastCall().url).toContain('export')

    await api.runErasure('erasure-1')
    expect(lastCall().url).toContain('erasure-1')
  })

  it('filters portfolios by query and status', async () => {
    await api.fetchPortfolios('ada', 'published')
    expect(lastCall().url).toContain('ada')
    expect(lastCall().url).toContain('published')
  })

  it('sends no empty filter parameters', async () => {
    await api.fetchPortfolios('', '')
    expect(lastCall().url).not.toContain('=&')
    expect(lastCall().url.endsWith('=')).toBe(false)
  })
})

describe('failure', () => {
  it('reports a validation error as one, with every message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: ['slug is taken', 'slug is reserved'] }, 400),
    )

    const error = await api.fetchMe().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(api.ApiError)
    expect((error as InstanceType<typeof api.ApiError>).isValidation).toBe(true)
    expect((error as InstanceType<typeof api.ApiError>).messages).toHaveLength(2)
  })

  it('does not treat a server error as a validation error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'boom' }, 500))

    const error = (await api.fetchMe().catch((e: unknown) => e)) as InstanceType<
      typeof api.ApiError
    >

    expect(error.isValidation).toBe(false)
    expect(error.status).toBe(500)
  })

  it('retries once after refreshing a session, then gives up', async () => {
    const refresh = vi.fn(() => Promise.resolve(true))
    api.setUnauthorizedHandler(refresh)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    await expect(api.fetchMe()).resolves.toEqual({ ok: true })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry when the session cannot be refreshed', async () => {
    api.setUnauthorizedHandler(() => Promise.resolve(false))
    fetchMock.mockResolvedValue(jsonResponse({ message: 'expired' }, 401))

    await expect(api.fetchMe()).rejects.toBeInstanceOf(api.ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('turns a network failure into an ApiError rather than leaking it', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))

    const error = (await api.fetchMe().catch((e: unknown) => e)) as InstanceType<
      typeof api.ApiError
    >

    expect(error).toBeInstanceOf(api.ApiError)
    expect(error.status).toBe(0)
  })

  it('sends no Authorization header when there is no token', async () => {
    api.setTokenProvider(() => Promise.resolve(null))
    await api.fetchHealth()

    expect((lastCall().init.headers as Record<string, string>).Authorization).toBeUndefined()
  })
})
