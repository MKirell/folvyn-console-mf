import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { beginLogin } from '@/services/pkce'

function token(claims: object): string {
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${payload}.signature`
}

const ADMIN_TOKEN = token({
  sub: 'u1',
  exp: 9,
  username: 'ada-lovelace',
  'cognito:groups': ['folvyn-platform'],
})
const SCOPED_TOKEN = token({
  sub: 'u2',
  exp: 9,
  username: 'guest',
  scope: 'folvyn-portfolio-ms/admin',
})

function tokenResponse(access: string, expiresIn = 900): Response {
  return {
    ok: true,
    json: () =>
      Promise.resolve({ access_token: access, refresh_token: 'refresh-1', expires_in: expiresIn }),
  } as Response
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('auth store', () => {
  it('starts signed out', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.isPlatform).toBe(false)
  })

  it('grants the platform role only to a token carrying that group', async () => {
    const auth = useAuthStore()
    const state = new URL(await beginLogin('/insights')).searchParams.get('state') as string
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(tokenResponse(ADMIN_TOKEN))),
    )

    expect(await auth.completeLogin('code-1', state)).toBe('/insights')
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isPlatform).toBe(true)
    expect(auth.username).toBe('ada-lovelace')
  })

  it('refuses the platform role to a token that only carries a scope', async () => {
    const auth = useAuthStore()
    const state = new URL(await beginLogin('/')).searchParams.get('state') as string
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(tokenResponse(SCOPED_TOKEN))),
    )

    await auth.completeLogin('code-1', state)

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isPlatform).toBe(false)
    expect(auth.groups).toEqual([])
  })

  it('shares the refresh token across tabs and keeps the access token out of storage', async () => {
    const auth = useAuthStore()
    const state = new URL(await beginLogin('/')).searchParams.get('state') as string
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(tokenResponse(ADMIN_TOKEN))),
    )

    await auth.completeLogin('code-1', state)

    expect(localStorage.getItem('console_refresh_token')).toBe('refresh-1')
    expect(sessionStorage.getItem('console_refresh_token')).toBeNull()
    expect(JSON.stringify(localStorage)).not.toContain(ADMIN_TOKEN)
    expect(JSON.stringify(sessionStorage)).not.toContain(ADMIN_TOKEN)
  })

  it('promotes a token left in per-tab storage, so an existing session survives a new tab', async () => {
    sessionStorage.setItem('console_refresh_token', 'legacy-token')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(tokenResponse(ADMIN_TOKEN))),
    )

    const auth = useAuthStore()
    await auth.restore()

    expect(auth.isAuthenticated).toBe(true)
    expect(localStorage.getItem('console_refresh_token')).toBeTruthy()
    expect(sessionStorage.getItem('console_refresh_token')).toBeNull()
  })

  it('signs the tab out when another tab clears the shared token', async () => {
    const auth = useAuthStore()
    const state = new URL(await beginLogin('/')).searchParams.get('state') as string
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(tokenResponse(ADMIN_TOKEN))),
    )
    await auth.completeLogin('code-1', state)
    expect(auth.isAuthenticated).toBe(true)

    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    })

    localStorage.removeItem('console_refresh_token')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'console_refresh_token',
        newValue: null,
        storageArea: localStorage,
      }),
    )

    expect(auth.isAuthenticated).toBe(false)
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('ignores a storage event for another key', async () => {
    const auth = useAuthStore()
    const state = new URL(await beginLogin('/')).searchParams.get('state') as string
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(tokenResponse(ADMIN_TOKEN))),
    )
    await auth.completeLogin('code-1', state)

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'console_rail_collapsed',
        newValue: null,
        storageArea: localStorage,
      }),
    )

    expect(auth.isAuthenticated).toBe(true)
  })

  it('restores a session from the refresh token', async () => {
    sessionStorage.setItem('console_refresh_token', 'refresh-1')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(tokenResponse(ADMIN_TOKEN))),
    )

    const auth = useAuthStore()
    await auth.restore()

    expect(auth.restoring).toBe(false)
    expect(auth.isPlatform).toBe(true)
  })

  it('clears the session when the refresh token is rejected', async () => {
    sessionStorage.setItem('console_refresh_token', 'stale')
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: false, status: 400, text: () => Promise.resolve('') } as Response),
      ),
    )

    const auth = useAuthStore()
    await auth.restore()

    expect(auth.isAuthenticated).toBe(false)
    expect(sessionStorage.getItem('console_refresh_token')).toBeNull()
  })

  it('does nothing on restore when the tab has no refresh token', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const auth = useAuthStore()
    await auth.restore()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('returns the cached token while it is still valid', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(tokenResponse(ADMIN_TOKEN)))
    vi.stubGlobal('fetch', fetchMock)
    sessionStorage.setItem('console_refresh_token', 'refresh-1')

    const auth = useAuthStore()
    await auth.restore()
    fetchMock.mockClear()

    expect(await auth.currentToken()).toBe(ADMIN_TOKEN)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refreshes a token that is about to expire', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(tokenResponse(ADMIN_TOKEN, 1)))
    vi.stubGlobal('fetch', fetchMock)
    sessionStorage.setItem('console_refresh_token', 'refresh-1')

    const auth = useAuthStore()
    await auth.restore()
    fetchMock.mockClear()

    await auth.currentToken()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('collapses concurrent refreshes into one request', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(tokenResponse(ADMIN_TOKEN)))
    vi.stubGlobal('fetch', fetchMock)
    sessionStorage.setItem('console_refresh_token', 'refresh-1')

    const auth = useAuthStore()
    await Promise.all([auth.refresh(), auth.refresh(), auth.refresh()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
