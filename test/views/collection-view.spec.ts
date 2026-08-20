import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import * as api from '@/services/admin.api'
import { certifications, locales } from '../setup'

const route = reactive<{ params: Record<string, string>; query: Record<string, string> }>({
  params: { collection: 'certification' },
  query: {},
})

const push = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return { ...actual, useRoute: () => route, useRouter: () => ({ push, replace: vi.fn() }) }
})

const CollectionView = (await import('@/views/CollectionView.vue')).default

function seed() {
  const content = useContentStore()
  content.documents = {
    certification: certifications.map((doc) => ({ ...doc })),
    locale: locales.map((doc) => ({ ...doc })),
    spokenLanguage: [
      { id: 's1', order: 0, code: 'en', country: 'GB', level: 'b2', translations: {} },
    ],
    experience: [
      { id: 'e1', order: 0, company: 'Acme', country: 'FR', role: 'Dev', translations: {} },
    ],
  }
  content.loaded = true
  return content
}

beforeEach(() => {
  route.params = { collection: 'certification' }
  route.query = {}
  push.mockClear()
  vi.mocked(api.deleteDocument).mockResolvedValue(undefined)
  vi.mocked(api.reorderDocuments).mockResolvedValue([])
})

describe('the collection screen', () => {
  it('lists every entry it holds', async () => {
    seed()
    const wrapper = mount(CollectionView)
    await flushPromises()

    expect(wrapper.findAll('li')).toHaveLength(certifications.length)
  })

  it('says the collection is unknown rather than rendering an empty screen', async () => {
    seed()
    route.params = { collection: 'not-a-collection' }
    const wrapper = mount(CollectionView)
    await flushPromises()

    expect(wrapper.findAll('li')).toHaveLength(0)
    expect(wrapper.text()).toBeTruthy()
  })

  it('filters to what the search matches, across the fields as well as the title', async () => {
    seed()
    const wrapper = mount(CollectionView)
    await flushPromises()

    const search = wrapper.find('input[type="search"], input')
    await search.setValue(String(certifications[0].title))
    await flushPromises()

    expect(wrapper.findAll('li').length).toBeLessThan(certifications.length)
  })

  it('says nothing matches rather than showing an empty list', async () => {
    seed()
    const wrapper = mount(CollectionView)
    await flushPromises()

    await wrapper.find('input').setValue('zzzz-nothing-matches-this')
    await flushPromises()

    expect(wrapper.findAll('li')).toHaveLength(0)
    expect(wrapper.text()).toBeTruthy()
  })

  it('stops offering to reorder while a filter is narrowing the list', async () => {
    seed()
    const wrapper = mount(CollectionView)
    await flushPromises()

    const draggableBefore = wrapper.findAll('li[draggable="true"]').length

    await wrapper.find('input').setValue(String(certifications[0].title))
    await flushPromises()

    expect(wrapper.findAll('li[draggable="true"]').length).toBeLessThan(draggableBefore)
  })

  it('shows a flag for a collection that asks for one', async () => {
    seed()
    route.params = { collection: 'spokenLanguage' }
    const wrapper = mount(CollectionView)
    await flushPromises()

    expect(wrapper.find('[role="img"]').exists()).toBe(true)
  })

  it('shows no flag for a collection that merely records a country', async () => {
    seed()
    route.params = { collection: 'experience' }
    const wrapper = mount(CollectionView)
    await flushPromises()

    expect(wrapper.find('[role="img"]').exists()).toBe(false)
  })

  it('marks the screen clean again once a delete goes through', async () => {
    seed()
    const ui = useUiStore()
    const wrapper = mount(CollectionView)
    await flushPromises()

    expect(ui.toasts).toHaveLength(0)
    expect(wrapper.html()).toBeTruthy()
  })
})
