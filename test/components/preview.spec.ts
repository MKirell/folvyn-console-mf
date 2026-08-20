import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PreviewFrame from '@/components/preview/PreviewFrame.vue'

function frameOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('iframe').element as HTMLIFrameElement
}

function boxOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('div[style*="height"]').element as HTMLElement
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', undefined)
})

describe('live preview sizing', () => {
  it('gives the mobile viewport a phone-shaped box rather than a flat fallback', async () => {
    const wrapper = mount(PreviewFrame, {
      props: { width: 390, scrollInside: true, section: 'project', payload: {} },
    })
    await nextTick()

    expect(boxOf(wrapper).style.height).toBeTruthy()
    expect(boxOf(wrapper).style.height).not.toBe('720px')
    wrapper.unmount()
  })

  it('lets the content scroll inside that box instead of stretching the page', async () => {
    const wrapper = mount(PreviewFrame, {
      props: { width: 390, scrollInside: true, section: 'project', payload: {} },
    })
    await nextTick()

    const box = parseFloat(boxOf(wrapper).style.height)
    const frame = Number(frameOf(wrapper).getAttribute('height'))

    expect(frame).toBeGreaterThanOrEqual(box - 1)
    wrapper.unmount()
  })

  it('grows to the content in desktop mode', async () => {
    const wrapper = mount(PreviewFrame, {
      props: { width: 1512, scrollInside: false, section: 'project', payload: {} },
    })
    await nextTick()

    expect(boxOf(wrapper).style.height).toBeTruthy()
    wrapper.unmount()
  })

  it('behaves identically for every previewable section', async () => {
    const heights = ['project', 'experience', 'degree', 'award'].map((section) => {
      const wrapper = mount(PreviewFrame, {
        props: { width: 390, scrollInside: true, section, payload: {} },
      })
      const height = boxOf(wrapper).style.height
      wrapper.unmount()
      return height
    })

    expect(new Set(heights).size).toBe(1)
  })
})
