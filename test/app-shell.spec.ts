import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const route = reactive<{
  meta: Record<string, unknown>
  fullPath: string
  path: string
  name: string
  params: Record<string, string>
  query: Record<string, string>
}>({
  meta: {},
  fullPath: '/insights',
  path: '/insights',
  name: 'insights',
  params: {},
  query: {},
})

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRoute: () => route,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), afterEach: vi.fn() }),
    RouterView: { name: 'RouterView', render: () => null },
  }
})

const App = (await import('@/App.vue')).default

function signedIn(value: boolean) {
  const auth = useAuthStore()
  Object.defineProperty(auth, 'isAuthenticated', { get: () => value, configurable: true })
  return auth
}

beforeEach(() => {
  route.meta = {}
  route.fullPath = '/insights'
  route.path = '/insights'
  route.name = 'insights'
  route.params = {}
  route.query = {}
})

describe('the console shell', () => {
  it('wraps a signed-in screen in the rail and the topbar', async () => {
    signedIn(true)
    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.findComponent({ name: 'AppRail' }).exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders a public screen bare, with no navigation around it', async () => {
    signedIn(false)
    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.findComponent({ name: 'AppRail' }).exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders a chrome-less route bare even when signed in', async () => {
    signedIn(true)
    route.meta = { chrome: false }
    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.findComponent({ name: 'AppRail' }).exists()).toBe(false)
    wrapper.unmount()
  })

  it('opens and closes the command palette on the keyboard shortcut', async () => {
    signedIn(true)
    const ui = useUiStore()
    const wrapper = mount(App, { attachTo: document.body })
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(ui.paletteOpen).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(ui.paletteOpen).toBe(false)

    wrapper.unmount()
  })

  it('ignores an ordinary keystroke', async () => {
    signedIn(true)
    const ui = useUiStore()
    const wrapper = mount(App, { attachTo: document.body })
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }))
    expect(ui.paletteOpen).toBe(false)

    wrapper.unmount()
  })

  it('warns before leaving only when there is something unsaved', async () => {
    signedIn(true)
    const ui = useUiStore()
    const wrapper = mount(App, { attachTo: document.body })
    await flushPromises()

    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    ui.dirty = true
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)

    wrapper.unmount()
  })
})
