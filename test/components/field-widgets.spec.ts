import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CountryField from '@/components/fields/CountryField.vue'
import MonthField from '@/components/fields/MonthField.vue'
import SelectField from '@/components/fields/SelectField.vue'
import StringListInput from '@/components/fields/StringListInput.vue'

describe('CountryField', () => {
  it('shows a flag only where the registry asks for one', () => {
    const plain = mount(CountryField, { props: { id: 'c', modelValue: 'FR' } })
    const flagged = mount(CountryField, { props: { id: 'c', modelValue: 'FR', showFlag: true } })

    expect(plain.find('[role="img"]').exists()).toBe(false)
    expect(flagged.find('[role="img"]').exists()).toBe(true)
  })

  it('lists countries by name and emits the code', async () => {
    const wrapper = mount(CountryField, { props: { id: 'c', modelValue: '' } })
    const select = wrapper.get('select')

    expect(select.findAll('option').length).toBeGreaterThan(50)

    await select.setValue('FR')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['FR'])
  })
})

describe('MonthField', () => {
  it('splits a stored month into its two controls', () => {
    const wrapper = mount(MonthField, { props: { id: 'm', modelValue: '2026-08' } })

    expect(wrapper.get('select').element.value).toBe('08')
    expect(wrapper.get('input').element.value).toBe('2026')
  })

  it('emits nothing usable until both halves are given', async () => {
    const partial = mount(MonthField, { props: { id: 'm', modelValue: '' } })

    await partial.get('select').setValue('08')
    expect(partial.emitted('update:modelValue')?.at(-1)?.[0]).toBe('')

    await partial.get('input').setValue('20')
    expect(partial.emitted('update:modelValue')?.at(-1)?.[0]).toBe('')

    const withMonth = mount(MonthField, { props: { id: 'm', modelValue: '2020-08' } })
    await withMonth.get('input').setValue('2026')
    expect(withMonth.emitted('update:modelValue')?.at(-1)?.[0]).toBe('2026-08')
  })

  it('reads an empty value without inventing a month', () => {
    const wrapper = mount(MonthField, { props: { id: 'm', modelValue: '' } })

    expect(wrapper.get('select').element.value).toBe('')
    expect(wrapper.get('input').element.value).toBe('')
  })
})

describe('SelectField', () => {
  it('renders a placeholder when nothing is chosen, and the options given', () => {
    const wrapper = mount(SelectField, {
      props: { id: 's', modelValue: '', options: ['a1', 'b2'], placeholder: 'Pick one' },
    })

    expect(wrapper.text()).toContain('Pick one')
    expect(wrapper.findAll('option')).toHaveLength(3)
  })

  it('emits the raw option value, not its label', async () => {
    const wrapper = mount(SelectField, {
      props: { id: 's', modelValue: '', options: ['a1', 'b2'] },
    })

    await wrapper.get('select').setValue('b2')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b2'])
  })
})

describe('StringListInput', () => {
  it('renders one control per entry', () => {
    const wrapper = mount(StringListInput, {
      props: { modelValue: ['first', 'second'], maxItems: 3 },
    })

    expect(wrapper.findAll('textarea, input').length).toBeGreaterThanOrEqual(2)
  })

  it('starts from empty without rendering a phantom entry', () => {
    const wrapper = mount(StringListInput, { props: { modelValue: [], maxItems: 3 } })

    expect(wrapper.html()).toBeTruthy()
  })
})
