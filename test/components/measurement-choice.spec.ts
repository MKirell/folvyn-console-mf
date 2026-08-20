import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MeasurementChoice from '@/components/legal/MeasurementChoice.vue'

const CONSENT_KEY = 'portfolio_consent'
const VISITOR_KEY = 'portfolio_visitor'

beforeEach(() => {
  localStorage.clear()
})

describe('measurement choice, on the privacy page', () => {
  it('offers nothing to withdraw when no choice was ever made', () => {
    const wrapper = mount(MeasurementChoice)

    expect(wrapper.text()).toContain('nothing stored on this device')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('explains an acceptance and offers to withdraw it', () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ id: 'abc', until: Date.now() + 1000 }))

    const wrapper = mount(MeasurementChoice)

    expect(wrapper.text()).toContain('thirteen months')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('explains a refusal and still offers to change it', () => {
    localStorage.setItem(CONSENT_KEY, 'refused')

    const wrapper = mount(MeasurementChoice)

    expect(wrapper.text()).toContain('nothing that identifies you is stored')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('clears both keys when the choice is withdrawn', async () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ id: 'abc', until: Date.now() + 1000 }))

    const wrapper = mount(MeasurementChoice)
    await wrapper.find('button').trigger('click')

    expect(localStorage.getItem(CONSENT_KEY)).toBeNull()
    expect(localStorage.getItem(VISITOR_KEY)).toBeNull()
    expect(wrapper.text()).toContain('nothing stored on this device')
  })

  it('says so when the console is a different origin from the portfolios', () => {
    const wrapper = mount(MeasurementChoice)

    expect(wrapper.text()).toContain('local development')
  })
})
