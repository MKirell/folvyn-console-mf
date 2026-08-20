import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const auth = {
  restoring: false,
  isAuthenticated: true,
  isPlatform: false,
  restore: vi.fn(async () => {}),
}

const content = {
  loaded: true,
  locales: [{ code: 'en' }] as { code: string }[],
  loadAll: vi.fn(async () => {}),
}

const ui = { dirty: false, confirmLeave: vi.fn(async () => true) }

vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('@/stores/content', () => ({ useContentStore: () => content }))
vi.mock('@/stores/ui', () => ({ useUiStore: () => ui }))

const { router } = await import('@/router')

describe('the router guard', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.replace('/legal/privacy')
    auth.restoring = false
    auth.isAuthenticated = true
    auth.isPlatform = false
    content.loaded = true
    content.locales = [{ code: 'en' }]
    ui.dirty = false
    ui.confirmLeave.mockResolvedValue(true)
    vi.clearAllMocks()
  })

  it('lets a public route through without a session', async () => {
    auth.isAuthenticated = false
    await router.push('/legal/privacy')

    expect(router.currentRoute.value.name).toBe('legal')
  })

  it('sends a visitor with no session to login, remembering where they were going', async () => {
    auth.isAuthenticated = false
    await router.push('/media')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.returnTo).toBe('/media')
  })

  it('restores a session before deciding anything', async () => {
    auth.restoring = true
    auth.isAuthenticated = false
    await router.push('/media')

    expect(auth.restore).toHaveBeenCalled()
  })

  it('keeps an operator inside /platform', async () => {
    auth.isPlatform = true
    await router.push('/media')

    expect(router.currentRoute.value.name).toBe('platform')
  })

  it('keeps an owner out of /platform', async () => {
    auth.isPlatform = false
    await router.push('/platform')

    expect(router.currentRoute.value.name).toBe('insights')
  })

  it('sends an owner with nothing published to onboarding', async () => {
    content.locales = []
    await router.push('/insights')

    expect(router.currentRoute.value.name).toBe('welcome')
  })

  it('keeps a set-up owner away from onboarding', async () => {
    content.locales = [{ code: 'en' }]
    await router.push('/welcome')

    expect(router.currentRoute.value.name).toBe('insights')
  })

  it('refuses to leave a dirty screen when the owner cancels', async () => {
    await router.push('/insights')
    ui.confirmLeave.mockResolvedValue(false)

    await router.push('/media').catch(() => undefined)

    expect(router.currentRoute.value.name).toBe('insights')
  })

  it('clears the dirty flag once a move is confirmed', async () => {
    ui.dirty = true
    await router.push('/media')

    expect(ui.dirty).toBe(false)
  })

  it('redirects the root to insights and an unknown path to not-found', async () => {
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('insights')

    await router.push('/nothing-here')
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})
