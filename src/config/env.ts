function trimSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export const API_BASE_URL = trimSlash(
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
)

export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000)

export const COGNITO_DOMAIN = trimSlash(import.meta.env.VITE_COGNITO_DOMAIN ?? '')

export const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID ?? ''

export const COGNITO_SCOPES = import.meta.env.VITE_COGNITO_SCOPES ?? 'openid email profile'

export const SITE_URL = trimSlash(import.meta.env.VITE_SITE_URL ?? 'https://folvyn.mkirell.com')

export const PORTFOLIO_PREFIX = 'fol'

export const PREVIEW_PATH = import.meta.env.VITE_PREVIEW_PATH ?? '/preview.html'

export function portfolioUrl(slug: string): string {
  return slug ? `${SITE_URL}/${PORTFOLIO_PREFIX}/${slug}` : SITE_URL
}

export const ASSETS_BASE_URL = trimSlash(
  import.meta.env.VITE_ASSETS_BASE_URL ??
    import.meta.env.VITE_SITE_URL ??
    'https://folvyn.mkirell.com',
)

export const AUTH_PROVIDERS = String(import.meta.env.VITE_AUTH_PROVIDERS ?? 'Google')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)

export const AUTH_CONFIGURED = COGNITO_DOMAIN.length > 0 && COGNITO_CLIENT_ID.length > 0
