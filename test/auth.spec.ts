import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { beginLogin, consumeReturnTo, decodeAccessToken, exchangeCode } from '@/services/pkce'

function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('PKCE', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('derives an S256 challenge and stores the verifier for this tab', async () => {
    const url = new URL(await beginLogin('/c/certification'))

    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(url.searchParams.get('redirect_uri')).toBe(`${location.origin}/auth/callback`)
    expect(sessionStorage.getItem('console_pkce_verifier')).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('produces a different verifier on every attempt', async () => {
    await beginLogin('/')
    const first = sessionStorage.getItem('console_pkce_verifier')
    await beginLogin('/')
    expect(sessionStorage.getItem('console_pkce_verifier')).not.toBe(first)
  })

  it('round-trips the requested destination', async () => {
    await beginLogin('/c/award/a1')
    expect(consumeReturnTo()).toBe('/c/award/a1')
    expect(consumeReturnTo()).toBe('/insights')
  })

  it('rejects a callback whose state does not match this tab', async () => {
    await beginLogin('/')
    await expect(exchangeCode('code-1', 'forged-state')).rejects.toThrow(/state did not match/i)
  })

  it('rejects a callback with no verifier in the tab', async () => {
    await expect(exchangeCode('code-1', 'anything')).rejects.toThrow(/state did not match/i)
  })

  it('clears the verifier once a code has been presented', async () => {
    await beginLogin('/')
    const state = new URL(await beginLogin('/')).searchParams.get('state') as string

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: 'a', refresh_token: 'r', expires_in: 900 }),
        } as Response),
      ),
    )

    await exchangeCode('code-1', state)
    expect(sessionStorage.getItem('console_pkce_verifier')).toBeNull()
  })

  it('surfaces a token endpoint failure', async () => {
    const state = new URL(await beginLogin('/')).searchParams.get('state') as string

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve('invalid_grant'),
        } as Response),
      ),
    )

    await expect(exchangeCode('code-1', state)).rejects.toThrow(/invalid_grant/)
  })
})

describe('access token claims', () => {
  it('reads the admins group out of a Cognito access token', () => {
    const token = `header.${base64Url({ sub: 'u1', exp: 1, 'cognito:groups': ['admins'] })}.sig`
    expect(decodeAccessToken(token)?.['cognito:groups']).toEqual(['admins'])
  })

  it('returns null for a malformed token rather than throwing', () => {
    expect(decodeAccessToken('not-a-token')).toBeNull()
    expect(decodeAccessToken('a.!!!.c')).toBeNull()
  })
})

describe('sign-out', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  function stubLocation(): ReturnType<typeof vi.fn> {
    const assign = vi.fn()
    vi.stubGlobal('location', { origin: 'http://localhost:4400', href: '/insights', assign })
    return assign
  }

  async function signedInAdmin() {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()

    auth.accessToken = 'token'
    auth.claims = { sub: 'u1', exp: 9_999_999_999, 'cognito:groups': ['admin'] }
    sessionStorage.setItem('console_refresh_token', 'r')

    return auth
  }

  it('asks Cognito to return to an origin the client actually allows', async () => {
    const { logoutUrl } = await import('@/services/pkce')

    const url = new URL(logoutUrl())
    const returnTo = url.searchParams.get('logout_uri')

    expect(returnTo).toBe(location.origin)
    expect(returnTo).not.toMatch(/\/login$/)
    expect(url.pathname).toBe('/logout')
    expect(url.searchParams.get('client_id')).toBeTruthy()
  })

  it('leaves for Cognito without first repainting the console as a signed-out shell', async () => {
    const assign = stubLocation()
    const auth = await signedInAdmin()

    auth.logout()

    expect(assign).toHaveBeenCalledWith(expect.stringContaining('/logout'))
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.claims).not.toBeNull()
    expect(sessionStorage.getItem('console_refresh_token')).toBeNull()
  })

  it('refuses to renew a session once sign-out has started', async () => {
    stubLocation()
    const auth = await signedInAdmin()

    auth.logout()

    await expect(auth.refresh()).resolves.toBe(false)
    expect(auth.isAuthenticated).toBe(true)
  })
})

describe('identity', () => {
  it('targets Google without rendering the Cognito login page', async () => {
    const { beginLogin } = await import('@/services/pkce')

    const url = new URL(await beginLogin('/insights', 'Google'))

    expect(url.pathname).toBe('/oauth2/authorize')
    expect(url.searchParams.get('identity_provider')).toBe('Google')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('omits the provider when the visitor wants the chooser', async () => {
    const { beginLogin } = await import('@/services/pkce')

    const url = new URL(await beginLogin('/insights'))

    expect(url.searchParams.has('identity_provider')).toBe(false)
  })

  it('describes the person from the id token, not the federated username', async () => {
    const { decodeIdToken } = await import('@/services/pkce')
    const body = {
      sub: 'Google_110510927257595594969',
      email: 'admin@mkirell.com',
      name: 'Mohamed Khalil ZRELLY',
      picture: 'https://lh3.googleusercontent.com/a/photo',
    }
    const token = `x.${btoa(JSON.stringify(body)).replace(/=+$/, '')}.y`

    const claims = decodeIdToken(token)

    expect(claims?.name).toBe('Mohamed Khalil ZRELLY')
    expect(claims?.picture).toContain('googleusercontent')
  })
})
