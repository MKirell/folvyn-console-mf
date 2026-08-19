import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import { useMediaStore } from '@/stores/media'
import { useAuthStore } from '@/stores/auth'
import * as api from '@/services/admin.api'
import { AUTH_PROVIDERS } from '@/config/env'
import { certifications, experiences, locales, person, profile } from './setup'

const route = reactive<{
  params: Record<string, string>
  query: Record<string, string>
  meta: Record<string, unknown>
  path: string
  fullPath: string
}>({ params: {}, query: {}, meta: {}, path: '/', fullPath: '/' })

const push = vi.fn()
const replace = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRoute: () => route,
    useRouter: () => ({ push, replace }),
  }
})

const AppRail = (await import('@/components/layout/AppRail.vue')).default
const AppTopbar = (await import('@/components/layout/AppTopbar.vue')).default
const CommandPalette = (await import('@/components/layout/CommandPalette.vue')).default
const CollectionView = (await import('@/views/CollectionView.vue')).default
const EntityEditorView = (await import('@/views/EntityEditorView.vue')).default
const LocalesView = (await import('@/views/LocalesView.vue')).default
const LocaleQueueView = (await import('@/views/LocaleQueueView.vue')).default
const SingletonView = (await import('@/views/SingletonView.vue')).default
const MediaView = (await import('@/views/MediaView.vue')).default
const HistoryView = (await import('@/views/HistoryView.vue')).default
const DashboardView = (await import('@/views/DashboardView.vue')).default
const LoginView = (await import('@/views/LoginView.vue')).default

function seed() {
  const content = useContentStore()
  content.documents = {
    certification: certifications.map((doc) => ({ ...doc })),
    experience: experiences.map((doc) => ({ ...doc })),
    locale: locales.map((doc) => ({ ...doc })),
  }
  content.singletons = { person: { ...person }, profile: { ...profile } }
  content.loaded = true
  useUiStore().setEditingLang('en')
  return content
}

beforeEach(() => {
  route.params = {}
  route.query = {}
  route.meta = {}
  route.path = '/'
  route.fullPath = '/'
  push.mockClear()
  replace.mockClear()
})

function fieldValues(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper
    .findAll('input, textarea')
    .map((field) => (field.element as HTMLInputElement | HTMLTextAreaElement).value)
}

describe('collection workbench', () => {
  it('lists every row with its translation chips', () => {
    seed()
    route.params = { collection: 'certification' }

    const wrapper = mount(CollectionView)

    expect(wrapper.text()).toContain('AI-900')
    expect(wrapper.text()).toContain('DP-900')
    expect(wrapper.findAll('li[draggable="true"]')).toHaveLength(2)
  })

  it('filters rows by free text', async () => {
    seed()
    route.params = { collection: 'certification' }

    const wrapper = mount(CollectionView)
    await wrapper.find('input[type="text"]').setValue('DP')

    expect(wrapper.text()).not.toContain('AI-900')
    expect(wrapper.text()).toContain('DP-900')
  })

  it('offers no translation filter on a collection that has nothing to translate', () => {
    seed()
    route.params = { collection: 'certification' }

    const wrapper = mount(CollectionView)

    expect(wrapper.find('[aria-label]').exists()).toBe(true)
    expect(wrapper.findAll('select')).toHaveLength(0)
  })

  it('disables dragging while a filter narrows the list', async () => {
    seed()
    route.params = { collection: 'certification' }

    const wrapper = mount(CollectionView)
    await wrapper.find('input[type="text"]').setValue('DP')

    expect(wrapper.findAll('li[draggable="true"]')).toHaveLength(0)
  })

  it('shows an empty state for a collection with no rows', () => {
    seed()
    route.params = { collection: 'award' }

    expect(mount(CollectionView).text()).toContain('No awards yet')
  })
})

describe('arriving from a locale work queue', () => {
  it('opens the entry in the locale the queue was for, not the last one used', async () => {
    seed()
    const ui = useUiStore()
    ui.setEditingLang('en')

    route.params = { collection: 'certification', id: 'c1' }
    route.query = { lang: 'fr' }

    mount(EntityEditorView)
    await nextTick()

    expect(ui.editingLang).toBe('fr')
  })

  it('ignores a language the portfolio does not have', async () => {
    seed()
    const ui = useUiStore()
    ui.setEditingLang('en')

    route.params = { collection: 'certification', id: 'c1' }
    route.query = { lang: 'zz' }

    mount(EntityEditorView)
    await nextTick()

    expect(ui.editingLang).toBe('en')
  })

  it('leaves the editing locale alone when the link carries none', async () => {
    seed()
    const ui = useUiStore()
    ui.setEditingLang('fr')

    route.params = { collection: 'certification', id: 'c1' }
    route.query = {}

    mount(EntityEditorView)
    await nextTick()

    expect(ui.editingLang).toBe('fr')
  })
})

describe('live preview on a narrow console', () => {
  it('offers only the mobile viewport and selects it', async () => {
    seed()
    route.params = { collection: 'certification', id: 'c1' }
    window.innerWidth = 420

    const wrapper = mount(EntityEditorView)
    await nextTick()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Live preview')
      ?.trigger('click')
    await nextTick()

    const labels = wrapper
      .findAll('[aria-pressed]')
      .map((button) => button.text())
      .filter((text) => /desktop|mobile/i.test(text))

    expect(labels).not.toContain('Desktop')
  })

  it('offers both viewports on a wide console', async () => {
    seed()
    route.params = { collection: 'certification', id: 'c1' }
    window.innerWidth = 1400

    const wrapper = mount(EntityEditorView)
    await nextTick()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Live preview')
      ?.trigger('click')
    await nextTick()

    const labels = wrapper.findAll('[aria-pressed]').map((button) => button.text())

    expect(labels).toContain('Desktop')
    expect(labels).toContain('Mobile')
  })
})

describe('entity editor', () => {
  it('raises the unsaved badge on a collection with no translations', async () => {
    seed()
    route.params = { collection: 'locale', id: 'l1' }
    const ui = useUiStore()

    const wrapper = mount(EntityEditorView)
    await nextTick()
    expect(ui.dirty).toBe(false)

    await wrapper.findAll('select')[1].setValue('fr')
    await nextTick()

    expect(ui.dirty).toBe(true)
  })

  it('opens a locale clean, so Save is disabled until something changes', async () => {
    seed()
    route.params = { collection: 'locale', id: 'l1' }

    const wrapper = mount(EntityEditorView)
    await nextTick()

    const save = wrapper.findAll('button').find((button) => button.text().includes('Save'))
    expect(save?.attributes('disabled')).toBeDefined()
  })

  it('edits the locale chosen in the topbar, and only that one', async () => {
    seed()
    route.params = { collection: 'experience', id: 'e1' }
    const ui = useUiStore()

    const wrapper = mount(EntityEditorView)

    expect(wrapper.text()).toContain('Details')
    expect(wrapper.find('[aria-label="Locale to edit"]').exists()).toBe(false)
    expect(fieldValues(wrapper)).toContain('Backend Engineer')

    ui.setEditingLang('fr')
    await nextTick()

    expect(fieldValues(wrapper)).toContain('Ingénieur backend')
    expect(fieldValues(wrapper)).not.toContain('Backend Engineer')
  })

  it('keeps the save button disabled until something changes', async () => {
    seed()
    route.params = { collection: 'certification', id: 'c1' }

    const wrapper = mount(EntityEditorView)
    const save = wrapper.findAll('button').find((button) => button.text().includes('Save'))
    expect(save?.attributes('disabled')).toBeDefined()

    await wrapper.find('input[type="text"]').setValue('Something else')
    await nextTick()

    expect(save?.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('raises the unsaved flag the shell and the unload guard read', async () => {
    seed()
    route.params = { collection: 'certification', id: 'c1' }
    const ui = useUiStore()

    const wrapper = mount(EntityEditorView)
    expect(ui.dirty).toBe(false)

    await wrapper.find('input[type="text"]').setValue('Something else')
    await nextTick()

    expect(ui.dirty).toBe(true)
    wrapper.unmount()
    expect(ui.dirty).toBe(false)
  })

  it('blocks a save that fails validation and surfaces the field error', async () => {
    seed()
    route.params = { collection: 'certification', id: 'new' }

    const wrapper = mount(EntityEditorView)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.createDocument).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('is required')
  })

  it('sends only the changed field on save', async () => {
    const content = seed()
    route.params = { collection: 'certification', id: 'c1' }
    vi.mocked(api.updateDocument).mockResolvedValue({ ...certifications[0], title: 'AI-900 v2' })

    const wrapper = mount(EntityEditorView)
    const titleInput = wrapper
      .findAll('input[type="text"]')
      .find((input) => (input.element as HTMLInputElement).value === 'AI-900')
    await titleInput?.setValue('AI-900 v2')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.updateDocument).toHaveBeenCalledWith('admin/certifications', 'c1', {
      title: 'AI-900 v2',
    })
    expect(content.find('certification', 'c1')?.title).toBe('AI-900 v2')
  })

  it('reports a missing document rather than rendering an empty form', () => {
    seed()
    route.params = { collection: 'certification', id: 'gone' }

    expect(mount(EntityEditorView).text()).toContain('no longer exists')
  })
})

describe('locales', () => {
  it('lists every locale with an enable switch', async () => {
    seed()
    const wrapper = mount(LocalesView)
    await flushPromises()

    expect(wrapper.text()).toContain('EN')
    expect(wrapper.text()).toContain('NL')
    expect(wrapper.findAll('[role="switch"]').length).toBe(3)
  })

  it('renders the ordered work queue for one locale', () => {
    seed()
    route.params = { code: 'fr' }

    const wrapper = mount(LocaleQueueView)

    expect(wrapper.text()).toContain('Foundation')
    expect(wrapper.text()).toContain('Hero')
    expect(wrapper.text()).toContain('Experiences')
  })
})

describe('bespoke screens', () => {
  it('splits the person document into fields, files and translations', () => {
    seed()
    route.meta = { collection: 'person' }
    const wrapper = mount(SingletonView)

    expect(wrapper.text()).toContain('Person')
    expect(wrapper.text()).toContain('Files')
    expect(wrapper.text()).toContain('Résumés')
  })

  it('renders the hero narrative on its own screen', () => {
    seed()
    route.meta = { collection: 'profile' }

    const wrapper = mount(SingletonView)

    expect(wrapper.text()).toContain('Hero')
    expect(wrapper.text()).toContain('Tagline')
  })

  it('flags a translated field with the locale being edited, beside its own label', () => {
    seed()
    route.meta = { collection: 'person' }
    useUiStore().setEditingLang('fr')

    const wrapper = mount(SingletonView)
    const badges = wrapper.findAll('[title*="translated"]')

    expect(badges.length).toBeGreaterThan(0)
    expect(badges.every((badge) => badge.text() === 'fr')).toBe(true)
  })

  it('keeps a translated field inside its own subject group, not a translations block', () => {
    seed()
    route.meta = { collection: 'person' }

    const titles = mount(SingletonView)
      .findAll('section h2')
      .map((heading) => heading.text())

    expect(titles).toContain('Identity')
    expect(titles).not.toContain('Translations')
  })

  it('keeps derived person fields out of the form', () => {
    seed()
    route.meta = { collection: 'person' }

    const html = mount(SingletonView).html()

    expect(html).not.toContain('phoneDisplay')
    expect(html).not.toContain('linkedinHandle')
    expect(html).not.toContain('addressCountryName')
  })

  it('warns when the asset bucket is unreachable', async () => {
    seed()
    vi.mocked(api.listAssets).mockRejectedValueOnce(new Error('404'))

    const wrapper = mount(MediaView)
    await flushPromises()

    expect(wrapper.text()).toContain('Your files could not be listed')
  })

  it('lists uploaded files with their reference count', async () => {
    seed()
    vi.mocked(api.listAssets).mockResolvedValueOnce([
      { key: 'certificate-azure-ai900.pdf', size: 1024, lastModified: '2026-01-01' },
      { key: 'unused.pdf', size: 2048, lastModified: '2026-01-01' },
    ])

    const wrapper = mount(MediaView)
    await flushPromises()

    expect(wrapper.text()).toContain('1 reference')
    expect(wrapper.text()).toContain('unreferenced')
  })

  it('explains that the undo stack is empty', async () => {
    seed()
    const wrapper = mount(HistoryView)
    await flushPromises()

    expect(wrapper.text()).toContain('Nothing to undo yet')
  })

  it('offers a retry when the analytics endpoint is absent', async () => {
    seed()
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('Your insights could not be read')
    expect(wrapper.text()).toContain('Try again')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})

describe('shell', () => {
  it('groups the rail exactly as the portfolio is organised', async () => {
    seed()
    const wrapper = mount(AppRail)
    await flushPromises()

    for (const group of ['Identity', 'Career', 'Education', 'Achievements', 'Workshop']) {
      expect(wrapper.text()).toContain(group)
    }
    expect(wrapper.text()).toContain('Insights')
  })

  it('lights exactly one platform tab, never the overview alongside it', async () => {
    seed()
    const auth = useAuthStore()
    auth.claims = { 'cognito:groups': ['folvyn-platform'] } as never

    const tabs = {
      '/platform': 'Overview',
      '/platform/portfolios': 'Portfolios',
      '/platform/erasures': 'Erasure queue',
      '/platform/traffic': 'Traffic',
      '/platform/health': 'Health',
      '/platform/audit': 'Audit',
      '/platform/config': 'Platform config',
    }

    for (const [path, label] of Object.entries(tabs)) {
      route.path = path
      const wrapper = mount(AppRail)
      await flushPromises()

      const lit = wrapper.findAll('[data-active="true"]')
      expect(lit, `wrong number of tabs lit on ${path}`).toHaveLength(1)
      expect(lit[0].text()).toContain(label)
      wrapper.unmount()
    }

    route.path = '/'
    auth.claims = null
  })

  it('collapses the rail and remembers it', async () => {
    seed()
    const ui = useUiStore()
    const wrapper = mount(AppRail)
    await flushPromises()

    ui.toggleRail()
    await nextTick()

    expect(ui.railCollapsed).toBe(true)
    expect(wrapper.find('aside').classes()).toContain('w-rail-tight')
  })

  it('shows the unsaved indicator only while a form is dirty', async () => {
    seed()
    const ui = useUiStore()
    const wrapper = mount(AppTopbar)

    expect(wrapper.text()).not.toContain('unsaved')
    ui.dirty = true
    await nextTick()
    expect(wrapper.text()).toContain('unsaved')
  })

  it('finds an entry by title in the command palette', async () => {
    seed()
    const ui = useUiStore()
    ui.paletteOpen = true

    const wrapper = mount(CommandPalette)
    await nextTick()
    await wrapper.find('input').setValue('DP-900')

    expect(wrapper.text()).toContain('DP-900')
    expect(wrapper.text()).toContain('Certification')
  })

  it('reports when nothing matches the palette query', async () => {
    seed()
    useUiStore().paletteOpen = true

    const wrapper = mount(CommandPalette)
    await nextTick()
    await wrapper.find('input').setValue('zzzzz')

    expect(wrapper.text()).toContain('Nothing matches')
  })
})

describe('login', () => {
  it('sends the visitor straight to Google, never to the Cognito page', async () => {
    const auth = useAuthStore()
    const login = vi.spyOn(auth, 'login').mockResolvedValue()

    const wrapper = mount(LoginView)
    const google = wrapper.findAll('button').find((b) => b.text().includes('Continue with Google'))
    await google?.trigger('click')

    expect(login).toHaveBeenCalledWith('/insights', 'Google')
  })

  it('offers only the configured providers, and never a password', () => {
    const wrapper = mount(LoginView)
    const buttons = wrapper.findAll('button')

    expect(buttons.map((b) => b.text().trim())).toEqual(
      AUTH_PROVIDERS.map((name) => `Continue with ${name}`),
    )
    expect(wrapper.text().toLowerCase()).not.toContain('password')
  })

  it('tells a first-time visitor an account is created for them, not that it is admin only', () => {
    const text = mount(LoginView).text().toLowerCase()

    expect(text).toContain('creates your portfolio')
    expect(text).not.toContain('admin only')
  })
})

describe('media store', () => {
  it('refuses to delete a file that content still references', async () => {
    seed()
    const media = useMediaStore()
    vi.mocked(api.listAssets).mockResolvedValueOnce([
      { key: 'certificate-azure-ai900.pdf', size: 1, lastModified: '2026-01-01' },
    ])
    await media.load(true)

    await expect(media.remove('certificate-azure-ai900.pdf')).rejects.toThrow(/still referenced/)
    expect(api.deleteAsset).not.toHaveBeenCalled()
  })

  it('rejects a file type outside the allowlist before presigning', async () => {
    const media = useMediaStore()
    const file = new File(['x'], 'payload.exe', { type: 'application/octet-stream' })

    await expect(media.upload(file)).rejects.toThrow(/not an accepted file type/)
    expect(api.presignUpload).not.toHaveBeenCalled()
  })

  it('uploads through a presigned PUT and records the returned key', async () => {
    const media = useMediaStore()
    vi.mocked(api.presignUpload).mockResolvedValueOnce({
      url: 'https://bucket.example/put',
      key: 'diploma.pdf',
      expiresIn: 300,
    })

    const file = new File(['x'], 'Diploma.pdf', { type: 'application/pdf' })
    expect(await media.upload(file)).toBe('diploma.pdf')

    expect(api.presignUpload).toHaveBeenCalledWith({
      filename: 'diploma.pdf',
      contentType: 'application/pdf',
      size: file.size,
    })
    expect(api.putToBucket).toHaveBeenCalledWith('https://bucket.example/put', file)
  })
})

describe('editing locale follows the locales collection', () => {
  it('offers one button per stored locale, not a hardcoded pair', () => {
    seed()

    const wrapper = mount(AppTopbar)
    const group = wrapper.find('[aria-label="Editing locale"]')

    expect(group.findAll('button')).toHaveLength(locales.length)
    expect(group.text()).toContain('nl')
  })

  it('picks up a locale added after boot', async () => {
    const content = seed()

    const wrapper = mount(AppTopbar)
    content.documents = {
      ...content.documents,
      locale: [...locales, { id: 'l4', order: 3, code: 'de', label: 'Deutsch', flagCode: 'de' }],
    }
    await nextTick()

    expect(wrapper.find('[aria-label="Editing locale"]').text()).toContain('de')
  })

  it('falls back to the reference locale when the edited one is deleted', async () => {
    const content = seed()
    const ui = useUiStore()
    ui.setEditingLang('nl')

    mount(AppTopbar)
    content.documents = { ...content.documents, locale: locales.filter((l) => l.code !== 'nl') }
    await nextTick()

    expect(ui.editingLang).toBe('en')
  })

  it('hides the group entirely when only one locale exists', () => {
    const content = seed()
    content.documents = { ...content.documents, locale: [locales[0]] }

    expect(mount(AppTopbar).find('[aria-label="Editing locale"]').exists()).toBe(false)
  })
})

describe('signed-in identity', () => {
  it('shows the Google name and avatar, never the federated username', async () => {
    seed()
    useUiStore().railCollapsed = false
    const auth = useAuthStore()
    auth.identity = {
      sub: 'Google_110510927257595594969',
      email: 'ada.lovelace@example.com',
      name: 'Ada Lovelace',
      picture: 'https://lh3.googleusercontent.com/a/photo',
    }

    const wrapper = mount(AppRail)
    await flushPromises()

    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('ada.lovelace@example.com')
    expect(wrapper.text()).not.toContain('Google_110510927257595594969')
    expect(wrapper.find('img[alt="Ada Lovelace"]').attributes('src')).toContain('googleusercontent')
  })

  it('falls back to initials when Google sends no picture', async () => {
    seed()
    useUiStore().railCollapsed = false
    const auth = useAuthStore()
    auth.identity = { sub: 'x', email: 'ada.lovelace@example.com', name: 'Ada Lovelace' }

    const wrapper = mount(AppRail)
    await flushPromises()

    expect(wrapper.find('img[alt="Ada Lovelace"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('AL')
  })
})
