import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PreviewFrame from '@/components/preview/PreviewFrame.vue'
import { PORTFOLIO_URL, PREVIEW_PATH } from '@/config/env'

const MESSAGE = 'folvyn:preview'

function render(props: Record<string, unknown> = {}) {
  return mount(PreviewFrame, {
    props: { width: 1200, payload: { title: 'x' }, section: 'profile', ...props },
    attachTo: document.body,
  })
}

function send(data: unknown, origin = new URL(PORTFOLIO_URL).origin) {
  window.dispatchEvent(new MessageEvent('message', { data, origin }))
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('the live preview', () => {
  it('loads the portfolio, never the console it is embedded in', () => {
    const wrapper = render()
    const src = wrapper.get('iframe').attributes('src')

    expect(src).toBe(`${PORTFOLIO_URL}${PREVIEW_PATH}`)
    wrapper.unmount()
  })

  it('says what it is waiting for until the portfolio answers', async () => {
    const wrapper = render()

    expect(wrapper.text()).toContain(new URL(PORTFOLIO_URL).origin)

    send({ type: `${MESSAGE}:ready` })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('Waiting for')
    wrapper.unmount()
  })

  it('grows to the height the portfolio reports, but never below its floor', async () => {
    const wrapper = render()

    send({ type: `${MESSAGE}:rendered`, height: 900 })
    await wrapper.vm.$nextTick()
    const tall = Number(wrapper.get('iframe').attributes('height'))

    send({ type: `${MESSAGE}:rendered`, height: 1 })
    await wrapper.vm.$nextTick()
    const floored = Number(wrapper.get('iframe').attributes('height'))

    expect(tall).toBeGreaterThan(floored)
    expect(floored).toBeGreaterThanOrEqual(120)
    wrapper.unmount()
  })

  it('ignores a message from any other origin', async () => {
    const wrapper = render()

    send({ type: `${MESSAGE}:ready` }, 'https://somewhere-else.test')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Waiting for')
    wrapper.unmount()
  })

  it('ignores a message that is not the preview protocol', async () => {
    const wrapper = render()

    send({ type: 'something-else' })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Waiting for')
    wrapper.unmount()
  })

  it('posts the section and its payload once the frame loads', async () => {
    const wrapper = render()
    const frame = wrapper.get('iframe').element as HTMLIFrameElement
    const post = vi.fn()

    Object.defineProperty(frame, 'contentWindow', { value: { postMessage: post } })
    await wrapper.get('iframe').trigger('load')

    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ type: MESSAGE, section: 'profile' }),
      new URL(PORTFOLIO_URL).origin,
    )
    wrapper.unmount()
  })

  it('scrolls inside its own box when asked to', () => {
    const wrapper = render({ scrollInside: true })

    expect(wrapper.html()).toBeTruthy()
    wrapper.unmount()
  })
})
