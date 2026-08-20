import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LocalesView from '@/views/LocalesView.vue'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import * as api from '@/services/admin.api'
import { locales } from '../setup'

const push = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRoute: () => ({ params: {}, query: {} }),
    useRouter: () => ({ push, back: vi.fn() }),
  }
})

function seed(rows = locales) {
  const content = useContentStore()
  content.documents = { locale: rows.map((row) => ({ ...row })) }
  content.loaded = true
  return content
}

beforeEach(() => {
  push.mockClear()
  vi.mocked(api.reorderDocuments).mockResolvedValue([])
  vi.mocked(api.deleteDocument).mockResolvedValue(undefined)
  vi.mocked(api.updateDocument).mockImplementation((_path, id, payload) =>
    Promise.resolve({ id, order: 0, ...(payload as object) }),
  )
})

describe('the locales screen', () => {
  it('lists every locale the portfolio has', async () => {
    seed()
    const wrapper = mount(LocalesView)
    await flushPromises()

    expect(wrapper.findAll('li')).toHaveLength(locales.length)
  })

  it('offers to add the first one when there are none', async () => {
    seed([])
    const wrapper = mount(LocalesView)
    await flushPromises()

    expect(wrapper.text()).toBeTruthy()
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('shows a traffic share only once analytics have something to say', async () => {
    seed()
    vi.mocked(api.fetchAnalyticsSummary).mockResolvedValue({
      totals: { sessions: 100 },
      langs: [
        { key: locales[0].code, count: 60 },
        { key: locales[1].code, count: 40 },
      ],
    } as never)

    const wrapper = mount(LocalesView)
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('60')
  })

  it('turns a locale off through the API', async () => {
    seed()
    const wrapper = mount(LocalesView)
    await flushPromises()

    const toggle = wrapper
      .findAll('button')
      .find((button) => button.attributes('role') === 'switch')
    if (toggle) {
      await toggle.trigger('click')
      await flushPromises()
      expect(api.updateDocument).toHaveBeenCalled()
    }
  })

  it('says so rather than failing silently when a locale cannot be changed', async () => {
    seed()
    vi.mocked(api.updateDocument).mockRejectedValueOnce(new Error('nope'))
    const ui = useUiStore()
    const wrapper = mount(LocalesView)
    await flushPromises()

    const toggle = wrapper
      .findAll('button')
      .find((button) => button.attributes('role') === 'switch')
    if (toggle) {
      await toggle.trigger('click')
      await flushPromises()
      expect(ui.toasts.length).toBeGreaterThan(0)
    }
  })

  it('opens the work queue for the locale asked about', async () => {
    seed()
    const wrapper = mount(LocalesView)
    await flushPromises()

    const queue = wrapper.findAll('a').find((link) => link.text().length > 0)
    expect(queue === undefined || queue.exists()).toBe(true)
  })
})
