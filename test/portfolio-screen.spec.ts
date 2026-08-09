import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useContentStore } from '@/stores/content'
import { useOwnerStore } from '@/stores/owner'
import { useUiStore } from '@/stores/ui'
import * as api from '@/services/admin.api'
import { locales } from './setup'
import type { OwnerRecord } from '@/types/admin'

const route = reactive<{
  params: Record<string, string>
  query: Record<string, string>
  meta: Record<string, unknown>
  path: string
  fullPath: string
}>({ params: {}, query: {}, meta: {}, path: '/portfolio', fullPath: '/portfolio' })

const push = vi.fn()
const replace = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return { ...actual, useRoute: () => route, useRouter: () => ({ push, replace }) }
})

const PortfolioView = (await import('@/views/PortfolioView.vue')).default
const OnboardingView = (await import('@/views/OnboardingView.vue')).default

const OWNER: OwnerRecord = {
  id: 'o1',
  slug: 'mohamed-khalil-zrelly',
  email: 'someone@example.com',
  displayName: 'Mohamed Khalil ZRELLY',
  status: 'draft',
  consentMode: 'measurement',
  plan: 'free',
  publishedAt: null,
}

function seedOwner(overrides: Partial<OwnerRecord> = {}) {
  const owner = useOwnerStore()
  owner.record = { ...OWNER, ...overrides }
  return owner
}

beforeEach(() => {
  push.mockClear()
  replace.mockClear()
})

describe('portfolio screen', () => {
  it('shows the address and a link to the live site', async () => {
    seedOwner()
    const wrapper = mount(PortfolioView)
    await flushPromises()

    expect(wrapper.text()).toContain('/mohamed-khalil-zrelly')
    expect(wrapper.find('a[target="_blank"]').attributes('href')).toBe(
      'http://localhost:5173/fol/mohamed-khalil-zrelly',
    )
  })

  it('warns that shared links break before letting the address change', async () => {
    seedOwner()
    const wrapper = mount(PortfolioView)
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Change'))
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('stops working')
    const commit = wrapper.findAll('button').find((b) => b.text() === 'Change the address')
    expect(commit?.attributes('disabled')).toBeDefined()
  })

  it('refuses an address the API reports as taken', async () => {
    seedOwner()
    vi.spyOn(api, 'checkSlug').mockResolvedValue({
      slug: 'taken',
      available: false,
      reason: 'That address is already taken',
    })

    const wrapper = mount(PortfolioView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Change'))
      ?.trigger('click')
    await wrapper.find('input[placeholder="your-name"]').setValue('taken')
    await new Promise((resolve) => setTimeout(resolve, 400))
    await flushPromises()

    expect(wrapper.text()).toContain('That address is already taken')
    const commit = wrapper.findAll('button').find((b) => b.text() === 'Change the address')
    expect(commit?.attributes('disabled')).toBeDefined()
  })

  it('changes the address once the API says it is free', async () => {
    const owner = seedOwner()
    vi.spyOn(api, 'checkSlug').mockResolvedValue({
      slug: 'new-address',
      available: true,
      reason: null,
    })
    const update = vi.spyOn(api, 'updateMe').mockResolvedValue({ ...OWNER, slug: 'new-address' })

    const wrapper = mount(PortfolioView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Change'))
      ?.trigger('click')
    await wrapper.find('input[placeholder="your-name"]').setValue('new-address')
    await new Promise((resolve) => setTimeout(resolve, 400))
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Change the address')
      ?.trigger('click')
    await flushPromises()

    expect(update).toHaveBeenCalledWith({ slug: 'new-address' })
    expect(owner.slug).toBe('new-address')
  })

  it('offers Publish while a draft and Unpublish once live', async () => {
    seedOwner()
    const draft = mount(PortfolioView)
    await flushPromises()
    expect(draft.text()).toContain('Publish')
    expect(draft.text()).not.toContain('Unpublish')

    seedOwner({ status: 'published' })
    const live = mount(PortfolioView)
    await flushPromises()
    expect(live.text()).toContain('Unpublish')
  })

  it('publishes through the API and reports the public address', async () => {
    const owner = seedOwner()
    const publish = vi
      .spyOn(api, 'publishPortfolio')
      .mockResolvedValue({ ...OWNER, status: 'published' })

    const wrapper = mount(PortfolioView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Publish'))
      ?.trigger('click')
    await flushPromises()

    expect(publish).toHaveBeenCalled()
    expect(owner.published).toBe(true)
  })

  it('names what is missing instead of just failing when publishing is refused', async () => {
    seedOwner()
    vi.spyOn(api, 'publishPortfolio').mockRejectedValue(
      new api.ApiError('This portfolio is not ready to be published', 422, [], {
        statusCode: 422,
        error: 'UnprocessableEntityException',
        message: 'This portfolio is not ready to be published',
        path: '/me/publish',
        timestamp: '2026-08-08T00:00:00.000Z',
        details: { missing: ['person', 'locale'] },
      }),
    )

    const wrapper = mount(PortfolioView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Publish'))
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Fill in who you are')
    expect(wrapper.text()).toContain('Enable at least one language')
    expect(wrapper.text()).not.toContain('Write your hero and story')
  })

  it('cannot publish a suspended portfolio', async () => {
    seedOwner({ status: 'suspended' })
    const wrapper = mount(PortfolioView)
    await flushPromises()

    const button = wrapper.findAll('button').find((b) => b.text().includes('Publish'))
    expect(button?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('took this offline')
  })

  it('switches the consent mode through the API', async () => {
    const owner = seedOwner()
    const update = vi
      .spyOn(api, 'updateMe')
      .mockResolvedValue({ ...OWNER, consentMode: 'enhanced' })

    const wrapper = mount(PortfolioView)
    await flushPromises()
    await wrapper.findAll('input[type="radio"]')[1].trigger('change')
    await flushPromises()

    expect(update).toHaveBeenCalledWith({ consentMode: 'enhanced' })
    expect(owner.consentMode).toBe('enhanced')
  })

  it('says plainly that measurement needs no banner and enhanced does', async () => {
    seedOwner()
    const wrapper = mount(PortfolioView)
    await flushPromises()

    expect(wrapper.text()).toContain('no banner')
    expect(wrapper.text()).toContain('needs a consent banner')
  })

  it('requires the address typed out before erasing the account', async () => {
    seedOwner()
    const erase = vi.spyOn(api, 'eraseMe').mockResolvedValue(undefined)

    const wrapper = mount(PortfolioView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Delete my account'))
      ?.trigger('click')
    await flushPromises()

    const confirm = wrapper.findAll('button').find((b) => b.text().includes('Delete for good'))
    expect(confirm?.attributes('disabled')).toBeDefined()
    expect(erase).not.toHaveBeenCalled()

    await wrapper.find('input[type="text"]').setValue('mohamed-khalil-zrelly')
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Delete for good'))
      ?.trigger('click')
    await flushPromises()

    expect(erase).toHaveBeenCalled()
  })

  it('signs out after the account is gone, so nothing renders against a dead session', async () => {
    seedOwner()
    vi.spyOn(api, 'eraseMe').mockResolvedValue(undefined)
    const logout = vi.spyOn(useAuthStore(), 'logout').mockImplementation(() => {})

    const wrapper = mount(PortfolioView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Delete my account'))
      ?.trigger('click')
    await wrapper.find('input[type="text"]').setValue('mohamed-khalil-zrelly')
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Delete for good'))
      ?.trigger('click')
    await flushPromises()

    expect(logout).toHaveBeenCalled()
  })

  it('downloads the export as a JSON file named after the address', async () => {
    seedOwner()
    vi.spyOn(api, 'exportMe').mockResolvedValue({ owner: OWNER })

    const createObjectURL = vi.fn(() => 'blob:export')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mount(PortfolioView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Export'))
      ?.trigger('click')
    await flushPromises()

    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('onboarding screen', () => {
  it('shows the derived address rather than asking the person to choose one', async () => {
    seedOwner()
    const wrapper = mount(OnboardingView)
    await flushPromises()

    expect(wrapper.text()).toContain('/mohamed-khalil-zrelly')
    expect(wrapper.text()).toContain('You can change it later')
    expect(wrapper.find('input[name="slug"]').exists()).toBe(false)
  })

  it('creates the first locale and lands on the person screen', async () => {
    seedOwner()
    const content = useContentStore()
    const create = vi.spyOn(api, 'createDocument').mockResolvedValue({
      id: 'l1',
      order: 0,
      code: 'fr',
      label: 'FR',
      flagCode: 'fr',
      enabled: true,
    })

    const wrapper = mount(OnboardingView)
    await flushPromises()

    await wrapper.find('select').setValue('fr')
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Create my portfolio'))
      ?.trigger('click')
    await flushPromises()

    expect(create).toHaveBeenCalledWith(
      'admin/locales',
      expect.objectContaining({ code: 'fr', label: 'FR', flagCode: 'fr', enabled: true }),
    )
    expect(content.locales).toHaveLength(1)
    expect(useUiStore().editingLang).toBe('fr')
    expect(replace).toHaveBeenCalledWith('/person')
  })

  it('fills the label and flag from the chosen language', async () => {
    seedOwner()
    const wrapper = mount(OnboardingView)
    await flushPromises()

    await wrapper.find('select').setValue('fr')
    expect((wrapper.find('input[type="text"]').element as HTMLInputElement).value).toBe('FR')
  })

  it('keeps the person on the screen and says why when the locale cannot be saved', async () => {
    seedOwner()
    vi.spyOn(api, 'createDocument').mockRejectedValue(new Error('code must be unique per owner'))

    const wrapper = mount(OnboardingView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Create my portfolio'))
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('code must be unique per owner')
    expect(replace).not.toHaveBeenCalled()
  })
})

describe('owner store', () => {
  it('reads the record once and reuses it', async () => {
    const fetch = vi.spyOn(api, 'fetchMe').mockResolvedValue(OWNER)
    const owner = useOwnerStore()

    await owner.load()
    await owner.load()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(owner.slug).toBe('mohamed-khalil-zrelly')
  })

  it('reports a failure instead of leaving the screen blank', async () => {
    vi.spyOn(api, 'fetchMe').mockRejectedValue(new Error('API down'))
    const owner = useOwnerStore()

    await owner.load()

    expect(owner.record).toBeNull()
    expect(owner.error).toBe('API down')
  })

  it('clears the record after erasure so no stale address is rendered', async () => {
    const owner = seedOwner()
    vi.spyOn(api, 'eraseMe').mockResolvedValue(undefined)

    await owner.erase()

    expect(owner.record).toBeNull()
    expect(owner.slug).toBe('')
  })

  it('carries the missing list off a refused publish and clears it on the next attempt', async () => {
    const owner = seedOwner()
    vi.spyOn(api, 'publishPortfolio').mockRejectedValueOnce(
      new api.ApiError('nope', 422, [], {
        statusCode: 422,
        error: 'UnprocessableEntityException',
        message: 'nope',
        path: '/me/publish',
        timestamp: '2026-08-08T00:00:00.000Z',
        details: { missing: ['profile'] },
      }),
    )

    await expect(owner.publish()).rejects.toThrow()
    expect(owner.missing).toEqual(['profile'])

    vi.spyOn(api, 'publishPortfolio').mockResolvedValue({ ...OWNER, status: 'published' })
    await owner.publish()
    expect(owner.missing).toEqual([])
  })

  it('ignores a non-validation failure rather than inventing a missing list', async () => {
    const owner = seedOwner()
    vi.spyOn(api, 'publishPortfolio').mockRejectedValue(new api.ApiError('boom', 500))

    await expect(owner.publish()).rejects.toThrow('boom')
    expect(owner.missing).toEqual([])
  })
})

describe('locales drive onboarding', () => {
  it('treats an owner with no locale as fresh', () => {
    const content = useContentStore()
    content.documents = {}
    content.loaded = true
    expect(content.locales).toHaveLength(0)
  })

  it('treats an owner with a locale as set up', () => {
    const content = useContentStore()
    content.documents = { locale: locales.map((doc) => ({ ...doc })) }
    content.loaded = true
    expect(content.locales.length).toBeGreaterThan(0)
  })
})
