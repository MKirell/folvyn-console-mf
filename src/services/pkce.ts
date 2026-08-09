import { COGNITO_CLIENT_ID, COGNITO_DOMAIN, COGNITO_SCOPES } from '@/config/env'

const VERIFIER_KEY = 'console_pkce_verifier'
const STATE_KEY = 'console_pkce_state'
const RETURN_KEY = 'console_pkce_return'

export interface TokenSet {
  accessToken: string
  refreshToken: string | null
  idToken: string | null
  expiresIn: number
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  id_token?: string
  expires_in: number
}

export interface AccessTokenClaims {
  sub: string
  exp: number
  username?: string
  scope?: string
  'cognito:groups'?: string[]
}

export interface IdTokenClaims {
  sub: string
  email?: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  identities?: { providerName?: string }[]
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return toBase64Url(new Uint8Array(digest))
}

export function redirectUri(): string {
  return `${location.origin}/auth/callback`
}

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    void 0
  }
}

function clearSession(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    void 0
  }
}

export type IdentityProvider = 'Google' | 'LinkedIn'

export async function beginLogin(returnTo: string, provider?: IdentityProvider): Promise<string> {
  const verifier = randomString(48)
  const state = randomString(16)

  writeSession(VERIFIER_KEY, verifier)
  writeSession(STATE_KEY, state)
  writeSession(RETURN_KEY, returnTo)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: COGNITO_CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: COGNITO_SCOPES,
    state,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: 'S256',
  })

  if (provider) params.set('identity_provider', provider)

  return `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`
}

export function consumeReturnTo(): string {
  const target = readSession(RETURN_KEY) ?? '/insights'
  clearSession(RETURN_KEY)
  return target
}

async function postToken(body: URLSearchParams): Promise<TokenSet> {
  const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Token endpoint responded ${response.status}${detail ? `: ${detail}` : ''}`)
  }

  const payload = (await response.json()) as TokenResponse
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    idToken: payload.id_token ?? null,
    expiresIn: payload.expires_in,
  }
}

export async function exchangeCode(code: string, state: string): Promise<TokenSet> {
  const expectedState = readSession(STATE_KEY)
  const verifier = readSession(VERIFIER_KEY)
  clearSession(STATE_KEY)
  clearSession(VERIFIER_KEY)

  if (!expectedState || state !== expectedState) {
    throw new Error('Authorization state did not match this browser session')
  }
  if (!verifier) {
    throw new Error('Authorization verifier is missing from this browser session')
  }

  return postToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: COGNITO_CLIENT_ID,
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  )
}

export function refreshTokens(refreshToken: string): Promise<TokenSet> {
  return postToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: COGNITO_CLIENT_ID,
      refresh_token: refreshToken,
    }),
  )
}

export function logoutUrl(): string {
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: location.origin,
  })
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`
}

function decodeSegment<T>(token: string): T | null {
  const segment = token.split('.')[1]
  if (!segment) return null

  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

export function decodeAccessToken(token: string): AccessTokenClaims | null {
  return decodeSegment<AccessTokenClaims>(token)
}

export function decodeIdToken(token: string): IdTokenClaims | null {
  return decodeSegment<IdTokenClaims>(token)
}
