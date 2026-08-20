import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { reactive } from 'vue'
import { legalDocument, legalDocuments, OPERATOR_EMAIL } from '@/registry/legal'
import type { LegalSection } from '@/registry/legal'

const route = reactive<{ params: Record<string, string> }>({ params: {} })

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRoute: () => route,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      options: {
        history: {
          get state() {
            return history.state
          },
        },
      },
    }),
  }
})

const LegalView = (await import('@/views/LegalView.vue')).default

beforeEach(() => {
  route.params = {}
})

describe('legal pages', () => {
  it('renders the privacy policy by default', () => {
    const wrapper = mount(LegalView)

    expect(wrapper.text()).toContain('Privacy')
    for (const section of legalDocument('privacy').sections) {
      expect(wrapper.text()).toContain(section.heading)
    }
  })

  it('renders the terms when the route asks for them', () => {
    route.params = { slug: 'terms' }
    const wrapper = mount(LegalView)

    expect(wrapper.text()).toContain('Terms')
    expect(wrapper.text()).toContain('Your address is yours to change')
  })

  it('states the three sub-processors the plan requires naming', () => {
    const text = legalDocument('privacy')
      .sections.flatMap((s: LegalSection) => [...(s.bullets ?? []), ...(s.paragraphs ?? [])])
      .join(' ')

    expect(text).toContain('Amazon Web Services')
    expect(text).toContain('eu-west-3')
    expect(text).toContain('MongoDB Atlas')
    expect(text).toContain('Google')
  })

  it('states the retention periods that the code actually enforces', () => {
    const text = legalDocument('privacy')
      .sections.flatMap((s: LegalSection) => s.bullets ?? [])
      .join(' ')

    expect(text).toContain('30 days')
    expect(text).toContain('25 months')
  })

  it('explains why there is no cookie banner, and when there is one', () => {
    const banner = legalDocument('privacy').sections.find((s) =>
      s.heading.includes('cookie banner'),
    )

    expect(banner).toBeDefined()
    expect(banner?.paragraphs?.join(' ')).toContain('audience measurement')
    expect(banner?.paragraphs?.join(' ')).toContain('refuse')
  })

  it('names the erasure and export rights the Portfolio screen provides', () => {
    const rights = legalDocument('privacy').sections.find((s) => s.heading === 'Your rights')

    expect(rights?.bullets?.join(' ')).toContain('Export everything')
    expect(rights?.bullets?.join(' ')).toContain('Delete your account')
  })

  it('offers a way to reach the operator', () => {
    const wrapper = mount(LegalView)

    expect(wrapper.find(`a[href="mailto:${OPERATOR_EMAIL}"]`).exists()).toBe(true)
  })

  it('links between both documents', () => {
    const wrapper = mount(LegalView)
    const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))

    for (const entry of legalDocuments()) {
      expect(targets).toContain(`/legal/${entry.slug}`)
    }
  })

  it('offers a way back only when the reader arrived from inside the console', () => {
    window.history.replaceState({ back: null }, '')
    const direct = mount(LegalView)
    expect(direct.findAll('button').some((button) => /back/i.test(button.text()))).toBe(false)
    direct.unmount()

    window.history.replaceState({ back: '/insights' }, '')
    const inApp = mount(LegalView)
    expect(inApp.findAll('button').some((button) => /back/i.test(button.text()))).toBe(true)
    inApp.unmount()
  })
})
