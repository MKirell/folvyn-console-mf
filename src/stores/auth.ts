import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  beginLogin,
  consumeReturnTo,
  decodeAccessToken,
  decodeIdToken,
  exchangeCode,
  logoutUrl,
  refreshTokens,
  type AccessTokenClaims,
  type IdentityProvider,
  type IdTokenClaims,
  type TokenSet,
} from '@/services/pkce'
import { setForbiddenHandler, setTokenProvider, setUnauthorizedHandler } from '@/services/admin.api'
import { AUTH_CONFIGURED } from '@/config/env'

const REFRESH_KEY = 'console_refresh_token'
const PLATFORM_GROUP = 'folvyn-platform'
const REFRESH_MARGIN_MS = 120_000

function readRefreshToken(): string | null {
  try {
    const shared = localStorage.getItem(REFRESH_KEY)
    if (shared) return shared

    const perTab = sessionStorage.getItem(REFRESH_KEY)
    if (perTab) {
      localStorage.setItem(REFRESH_KEY, perTab)
      sessionStorage.removeItem(REFRESH_KEY)
    }
    return perTab
  } catch {
    return null
  }
}

function writeRefreshToken(token: string | null): void {
  try {
    sessionStorage.removeItem(REFRESH_KEY)
    if (token) localStorage.setItem(REFRESH_KEY, token)
    else localStorage.removeItem(REFRESH_KEY)
  } catch {
    void 0
  }
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const refused = ref<string | null>(null)
  const claims = ref<AccessTokenClaims | null>(null)
  const identity = ref<IdTokenClaims | null>(null)
  const expiresAt = ref(0)
  const restoring = ref(true)
  const error = ref<string | null>(null)

  let refreshTimer = 0
  let inFlight: Promise<boolean> | null = null
  let signingOut = false

  const isAuthenticated = computed(() => accessToken.value !== null)
  const groups = computed(() => claims.value?.['cognito:groups'] ?? [])
  const isPlatform = computed(() => groups.value.includes(PLATFORM_GROUP))
  const username = computed(() => claims.value?.username ?? claims.value?.sub ?? '')

  const displayName = computed(() => {
    const id = identity.value
    if (!id) return ''
    if (id.name) return id.name
    const joined = [id.given_name, id.family_name].filter(Boolean).join(' ')
    if (joined) return joined
    return id.email ?? ''
  })

  const email = computed(() => identity.value?.email ?? '')
  const avatar = computed(() => identity.value?.picture ?? '')

  function scheduleRefresh(): void {
    clearTimeout(refreshTimer)
    if (!readRefreshToken()) return

    const delay = Math.max(5_000, expiresAt.value - Date.now() - REFRESH_MARGIN_MS)
    refreshTimer = window.setTimeout(() => void refresh(), delay)
  }

  function apply(tokens: TokenSet): void {
    if (signingOut) return
    accessToken.value = tokens.accessToken
    claims.value = decodeAccessToken(tokens.accessToken)
    if (tokens.idToken) identity.value = decodeIdToken(tokens.idToken)
    expiresAt.value = Date.now() + tokens.expiresIn * 1000
    if (tokens.refreshToken) writeRefreshToken(tokens.refreshToken)
    scheduleRefresh()
  }

  function clear(): void {
    clearTimeout(refreshTimer)
    accessToken.value = null
    claims.value = null
    identity.value = null
    expiresAt.value = 0
    writeRefreshToken(null)
  }

  async function refresh(): Promise<boolean> {
    if (signingOut) return false
    if (inFlight) return inFlight

    const token = readRefreshToken()
    if (!token) {
      clear()
      return false
    }

    inFlight = refreshTokens(token)
      .then((tokens) => {
        apply(tokens)
        return true
      })
      .catch(() => {
        clear()
        return false
      })
      .finally(() => {
        inFlight = null
      })

    return inFlight
  }

  async function restore(): Promise<void> {
    restoring.value = true
    if (readRefreshToken()) await refresh()
    restoring.value = false
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== REFRESH_KEY || event.storageArea !== localStorage) return

    if (event.newValue === null) {
      signingOut = true
      clearTimeout(refreshTimer)
      accessToken.value = null
      claims.value = null
      identity.value = null
      expiresAt.value = 0
      location.assign('/login')
      return
    }

    if (!accessToken.value) void refresh()
  }

  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)

  async function login(returnTo: string, provider?: IdentityProvider): Promise<void> {
    if (!AUTH_CONFIGURED) {
      error.value = 'Cognito is not configured for this build'
      return
    }
    location.assign(await beginLogin(returnTo, provider))
  }

  async function completeLogin(code: string, state: string): Promise<string> {
    error.value = null
    apply(await exchangeCode(code, state))
    return consumeReturnTo()
  }

  function logout(): void {
    signingOut = true
    clearTimeout(refreshTimer)
    writeRefreshToken(null)
    location.assign(AUTH_CONFIGURED ? logoutUrl() : '/login')
  }

  async function currentToken(): Promise<string | null> {
    if (accessToken.value && Date.now() < expiresAt.value - 5_000) return accessToken.value
    return (await refresh()) ? accessToken.value : null
  }

  setTokenProvider(currentToken)
  setUnauthorizedHandler(refresh)
  setForbiddenHandler((message) => {
    refused.value = message
  })

  return {
    accessToken,
    refused,
    claims,
    expiresAt,
    restoring,
    error,
    isAuthenticated,
    isPlatform,
    groups,
    username,
    identity,
    displayName,
    email,
    avatar,
    restore,
    login,
    completeLogin,
    logout,
    refresh,
    currentToken,
  }
})
