import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ToastStack from '@/components/layout/ToastStack.vue'
import { useUiStore } from '@/stores/ui'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('ToastStack', () => {
  it('renders nothing until something is said', () => {
    const wrapper = mount(ToastStack)

    expect(wrapper.text()).toBe('')
  })

  it('renders a message with and without its detail line', () => {
    const ui = useUiStore()
    ui.notify('good', 'Saved')
    ui.notify('bad', 'Save failed', 'the API refused it')

    const wrapper = mount(ToastStack)

    expect(wrapper.text()).toContain('Saved')
    expect(wrapper.text()).toContain('Save failed')
    expect(wrapper.text()).toContain('the API refused it')
  })

  it('dismisses the one whose button was pressed, and leaves the rest', async () => {
    const ui = useUiStore()
    ui.notify('good', 'First')
    ui.notify('good', 'Second')

    const wrapper = mount(ToastStack)
    await wrapper.findAll('button')[0].trigger('click')

    expect(wrapper.text()).not.toContain('First')
    expect(wrapper.text()).toContain('Second')
  })

  it('takes itself away after its time is up', () => {
    vi.useFakeTimers()
    const ui = useUiStore()

    ui.notify('good', 'Saved')
    expect(ui.toasts).toHaveLength(1)

    vi.runAllTimers()
    expect(ui.toasts).toHaveLength(0)

    vi.useRealTimers()
  })
})
