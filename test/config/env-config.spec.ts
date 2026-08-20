import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEYS = [
  'VITE_API_BASE_URL',
  'VITE_API_TIMEOUT_MS',
  'VITE_COGNITO_DOMAIN',
  'VITE_COGNITO_CLIENT_ID',
  'VITE_COGNITO_SCOPES',
  'VITE_SITE_URL',
  'VITE_PORTFOLIO_URL',
  'VITE_PREVIEW_PATH',
  'VITE_ASSETS_BASE_URL',
  'VITE_AUTH_PROVIDERS',
]

async function loadWith(values: Record<string, string>) {
  vi.resetModules()
  for (const key of KEYS) {
    vi.stubEnv(key, values[key] as unknown as string)
  }
  return import('@/config/env')
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('the console configuration', () => {
  it('reads every address from the environment, trailing slashes trimmed', async () => {
    const env = await loadWith({
      VITE_API_BASE_URL: 'https://example.test/api/v1/',
      VITE_COGNITO_DOMAIN: 'https://auth.example.test/',
      VITE_COGNITO_CLIENT_ID: 'client-1',
      VITE_SITE_URL: 'https://console.example.test/',
      VITE_PORTFOLIO_URL: 'https://portfolio.example.test/',
      VITE_ASSETS_BASE_URL: 'https://assets.example.test/',
      VITE_API_TIMEOUT_MS: '9000',
      VITE_AUTH_PROVIDERS: 'Google, LinkedIn',
      VITE_PREVIEW_PATH: '/app/portfolio/preview.html',
    })

    expect(env.API_BASE_URL).toBe('https://example.test/api/v1')
    expect(env.COGNITO_DOMAIN).toBe('https://auth.example.test')
    expect(env.SITE_URL).toBe('https://console.example.test')
    expect(env.PORTFOLIO_URL).toBe('https://portfolio.example.test')
    expect(env.ASSETS_BASE_URL).toBe('https://assets.example.test')
    expect(env.API_TIMEOUT_MS).toBe(9000)
    expect(env.AUTH_PROVIDERS).toEqual(['Google', 'LinkedIn'])
    expect(env.AUTH_CONFIGURED).toBe(true)
  })

  it('sends the portfolio link to the portfolio, not to itself', async () => {
    const env = await loadWith({
      VITE_SITE_URL: 'https://console.example.test',
      VITE_PORTFOLIO_URL: 'https://portfolio.example.test',
    })

    expect(env.portfolioUrl('ada-lovelace')).toBe('https://portfolio.example.test/fol/ada-lovelace')
    expect(env.portfolioUrl('')).toBe('https://portfolio.example.test')
  })

  it('falls back to the site when no portfolio address is given, which is how one host serves both', async () => {
    const env = await loadWith({ VITE_SITE_URL: 'https://folvyn.example.test' })

    expect(env.PORTFOLIO_URL).toBe('https://folvyn.example.test')
    expect(env.portfolioUrl('ada-lovelace')).toBe('https://folvyn.example.test/fol/ada-lovelace')
  })

  it('reports sign-in as unconfigured rather than half-configured', async () => {
    const withoutClient = await loadWith({ VITE_COGNITO_DOMAIN: 'https://auth.example.test' })
    expect(withoutClient.AUTH_CONFIGURED).toBe(false)

    const withoutDomain = await loadWith({ VITE_COGNITO_CLIENT_ID: 'client-1' })
    expect(withoutDomain.AUTH_CONFIGURED).toBe(false)
  })

  it('has a working default for every optional value', async () => {
    const env = await loadWith({})

    expect(env.API_TIMEOUT_MS).toBeGreaterThan(0)
    expect(env.COGNITO_SCOPES).toContain('openid')
    expect(env.AUTH_PROVIDERS).toEqual(['Google'])
    expect(env.PREVIEW_PATH).toBe('/preview.html')
    expect(env.PORTFOLIO_PREFIX).toBe('fol')
  })
})
