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

  it('explains that nothing was created for the account', async () => {
    const auth = useAuthStore()
    auth.refused = ''

    const wrapper = mount(RefusedView, { global: { plugins: [i18n] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Nothing has been created for you')
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
