import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import RefusedView from '@/views/RefusedView.vue'
import { useAuthStore } from '@/stores/auth'

describe('the refused screen', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('never quotes the request that was refused', async () => {
    const auth = useAuthStore()
    auth.refused = '/admin/experiences responded 403'

    const wrapper = mount(RefusedView, { global: { plugins: [i18n] } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('/admin/experiences')
    expect(wrapper.text()).not.toContain('403')
  })

  it('says in one line why the console will not open', async () => {
    const auth = useAuthStore()
    auth.refused = ''

    const wrapper = mount(RefusedView, { global: { plugins: [i18n] } })
    await flushPromises()

    expect(wrapper.text()).toContain('This environment is limited to its testers')
  })

  it('never shows the address that was refused', async () => {
    const auth = useAuthStore()
    auth.refused = 'nope'
    auth.identity = { email: 'someone@example.com' } as never

    const wrapper = mount(RefusedView, { global: { plugins: [i18n] } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('someone@example.com')
  })

  it('offers a way out', async () => {
    const auth = useAuthStore()
    auth.refused = 'no'
    const logout = vi.spyOn(auth, 'logout').mockImplementation(() => {})

    const wrapper = mount(RefusedView, { global: { plugins: [i18n] } })
    await wrapper.find('button').trigger('click')

    expect(logout).toHaveBeenCalledTimes(1)
  })
})
