import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

function token(claims: object): string {
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${payload}.signature`
}

function tokenResponse(access: string, id?: string): Response {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        access_token: access,
        id_token: id,
        refresh_token: 'refresh-1',
        expires_in: 900,
      }),
  } as Response
}

const ACCESS = token({ sub: 'u1', exp: 9, username: 'Google_110510927257595594969' })

async function signIn(idClaims?: object) {
  const auth = useAuthStore()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(tokenResponse(ACCESS, idClaims ? token(idClaims) : undefined))),
  )
  localStorage.setItem('console_refresh_token', 'refresh-1')
  await auth.restore()
  return auth
}

beforeEach(() => {
  setActivePinia(createPinia())
  sessionStorage.clear()
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('who the console says you are', () => {
  it('prefers the name the provider gave', async () => {
    const auth = await signIn({ name: 'Ada Lovelace', email: 'ada@example.com' })

    expect(auth.displayName).toBe('Ada Lovelace')
    expect(auth.email).toBe('ada@example.com')
  })

  it('joins the given and family names when there is no single name', async () => {
    const auth = await signIn({ given_name: 'Ada', family_name: 'Lovelace' })

    expect(auth.displayName).toBe('Ada Lovelace')
  })

  it('falls back to the email rather than showing nothing', async () => {
    const auth = await signIn({ email: 'ada@example.com' })

    expect(auth.displayName).toBe('ada@example.com')
  })

  it('shows the avatar the provider gave, and nothing when it gave none', async () => {
    const withPicture = await signIn({ name: 'Ada', picture: 'https://example.test/a.png' })
    expect(withPicture.avatar).toBe('https://example.test/a.png')

    setActivePinia(createPinia())
    localStorage.clear()
    const without = await signIn({ name: 'Ada' })
    expect(without.avatar).toBe('')
  })

  it('shows nothing at all before an ID token has been read', async () => {
    const auth = await signIn()

    expect(auth.displayName).toBe('')
    expect(auth.email).toBe('')
    expect(auth.avatar).toBe('')
  })

  it('never shows the raw federated username as a name', async () => {
    const auth = await signIn({ name: 'Ada Lovelace' })

    expect(auth.displayName).not.toContain('Google_')
  })

  it('signs out by dropping the shared token and leaving for the logout URL', async () => {
    const auth = await signIn({ name: 'Ada' })
    expect(localStorage.getItem('console_refresh_token')).toBe('refresh-1')

    auth.logout()

    expect(localStorage.getItem('console_refresh_token')).toBeNull()
    expect(location.assign).toHaveBeenCalled()
  })
})
