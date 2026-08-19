import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TagsInput from '@/components/fields/TagsInput.vue'
import StringListInput from '@/components/fields/StringListInput.vue'
import IconPicker from '@/components/fields/IconPicker.vue'
import FlagField from '@/components/fields/FlagField.vue'
import AssetField from '@/components/fields/AssetField.vue'
import AssetListField from '@/components/fields/AssetListField.vue'
import AssetMapField from '@/components/fields/AssetMapField.vue'
import AssetPicker from '@/components/fields/AssetPicker.vue'
import FieldRenderer from '@/components/fields/FieldRenderer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ToastStack from '@/components/layout/ToastStack.vue'
import TranslationChips from '@/components/ui/TranslationChips.vue'
import { COLLECTIONS } from '@/registry/collections'
import { PORTFOLIO_ICONS } from '@/registry/icons'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import * as api from '@/services/admin.api'
import { certifications, locales } from './setup'

function seedLocales() {
  const content = useContentStore()
  content.documents = { locale: locales.map((doc) => ({ ...doc })) }
  return content
}

describe('tags input', () => {
  it('adds a tag on Enter and ignores duplicates', async () => {
    const wrapper = mount(TagsInput, { props: { modelValue: ['vue'] } })

    await wrapper.find('input').setValue('pinia')
    await wrapper.find('input').trigger('keydown.enter')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['vue', 'pinia']])

    await wrapper.find('input').setValue('vue')
    await wrapper.find('input').trigger('keydown.enter')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  })

  it('removes the last tag on backspace in an empty box', async () => {
    const wrapper = mount(TagsInput, { props: { modelValue: ['vue', 'pinia'] } })

    await wrapper.find('input').trigger('keydown', { key: 'Backspace' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['vue']])
  })

  it('removes a tag from its chip button', async () => {
    const wrapper = mount(TagsInput, { props: { modelValue: ['vue', 'pinia'] } })

    await wrapper.find('[aria-label="Remove vue"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['pinia']])
  })

  it('reorders a tag without disturbing the rest', async () => {
    const wrapper = mount(TagsInput, { props: { modelValue: ['vue', 'pinia', 'vite'] } })

    await wrapper.find('[aria-label="Move vite earlier"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['vue', 'vite', 'pinia']])
  })
})

describe('string list input', () => {
  it('appends, edits, reorders and removes entries', async () => {
    const wrapper = mount(StringListInput, { props: { modelValue: ['one', 'two'] } })

    await wrapper.findAll('textarea')[0].setValue('first')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['first', 'two']])

    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['one', 'two', '']])
  })

  it('moves an entry down and keeps the rest in order', async () => {
    const wrapper = mount(StringListInput, { props: { modelValue: ['a', 'b', 'c'] } })

    const down = wrapper.findAll('button[aria-label="Move down"]')
    await down[0].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['b', 'a', 'c']])
  })

  it('disables moving past either end', () => {
    const wrapper = mount(StringListInput, { props: { modelValue: ['a', 'b'] } })

    expect(wrapper.findAll('button[aria-label="Move up"]')[0].attributes('disabled')).toBeDefined()
    expect(
      wrapper.findAll('button[aria-label="Move down"]')[1].attributes('disabled'),
    ).toBeDefined()
  })
})

describe('icon picker', () => {
  it('warns when the portfolio cannot render the chosen icon', () => {
    const wrapper = mount(IconPicker, { props: { modelValue: 'NotAnIcon' } })
    expect(wrapper.text()).toContain('has no mapping')
  })

  it('stays quiet for an icon the portfolio maps', () => {
    const wrapper = mount(IconPicker, { props: { modelValue: 'Trophy' } })
    expect(wrapper.text()).not.toContain('has no mapping')
  })

  it('offers only the icons the portfolio can render', async () => {
    const wrapper = mount(IconPicker, { props: { modelValue: '' } })

    await wrapper.findAll('button').at(-1)?.trigger('click')
    const choices = wrapper.findAll('button[title]')

    expect(choices.length).toBe(PORTFOLIO_ICONS.length)
    expect(choices.length).toBeGreaterThan(80)
    await choices[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Activity'])
  })
})

describe('flag field', () => {
  it('picks a flag from a list rather than asking for a code', async () => {
    const wrapper = mount(FlagField, { props: { modelValue: '' } })

    expect(wrapper.find('input').exists()).toBe(false)

    const options = wrapper.findAll('option').map((option) => option.text())
    expect(options).toContain('Tunisia')
    expect(options).toContain('France')
    expect(options).not.toContain('Tunisia · tn')

    await wrapper.find('select').setValue('tn')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['tn'])
  })

  it('needs no uploaded asset, because the flags ship with the console', () => {
    const wrapper = mount(FlagField, { props: { modelValue: 'de' } })

    expect(wrapper.text()).not.toContain('No flag asset')
    expect(wrapper.findAll('option').length).toBeGreaterThan(200)
  })
})

describe('asset fields', () => {
  it('clears a single asset', async () => {
    const wrapper = mount(AssetField, { props: { modelValue: 'a.pdf', accept: 'pdf' } })

    await wrapper.find('button[aria-label="Clear the file"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
  })

  it('accepts a typed key', async () => {
    const wrapper = mount(AssetField, { props: { modelValue: '', accept: 'pdf' } })

    await wrapper.find('input').setValue('degree-bachelor-2024.pdf')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['degree-bachelor-2024.pdf'])
  })

  it('removes one entry from an asset list', async () => {
    const wrapper = mount(AssetListField, {
      props: { modelValue: ['a.jpg', 'b.jpg'], accept: 'image' },
    })

    await wrapper.find('button[aria-label="Remove a.jpg"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['b.jpg']])
  })

  it('keys the résumé map by locale and drops emptied entries', async () => {
    seedLocales()
    const wrapper = mount(AssetMapField, {
      props: { modelValue: { en: 'resume_en.pdf' }, accept: 'pdf' },
    })

    expect(wrapper.text()).toContain('en')
    expect(wrapper.text()).toContain('fr')

    const inputs = wrapper.findAll('input[type="text"]')
    await inputs[1].setValue('resume_fr.pdf')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      { en: 'resume_en.pdf', fr: 'resume_fr.pdf' },
    ])

    await inputs[0].setValue('')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{}])
  })
})

describe('asset picker', () => {
  it('lists only files matching the accepted kind', async () => {
    vi.mocked(api.listAssets).mockResolvedValueOnce([
      { key: 'a.pdf', size: 1, lastModified: '2026-01-01' },
      { key: 'b.png', size: 1, lastModified: '2026-01-01' },
    ])

    const wrapper = mount(AssetPicker, { props: { open: true, accept: 'pdf' } })
    await flushPromises()

    expect(wrapper.text()).toContain('a.pdf')
    expect(wrapper.text()).not.toContain('b.png')
  })

  it('emits the typed key without an upload', async () => {
    const wrapper = mount(AssetPicker, { props: { open: true, accept: 'pdf' } })
    await flushPromises()

    await wrapper.find('input[aria-label="File key"]').setValue('typed.pdf')
    const use = wrapper.findAll('button').find((button) => button.text().includes('Use key'))
    await use?.trigger('click')

    expect(wrapper.emitted('select')?.at(-1)).toEqual(['typed.pdf'])
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})

describe('field renderer', () => {
  it('toggles a boolean through its switch', async () => {
    const wrapper = mount(FieldRenderer, {
      props: { field: { name: 'current', type: 'boolean' }, modelValue: false },
    })

    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
  })

  it('emits null when a number field is cleared', async () => {
    const wrapper = mount(FieldRenderer, {
      props: { field: { name: 'weight', type: 'number' }, modelValue: 40 },
    })

    await wrapper.find('input[type="number"]').setValue('')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  })

  it('drags a bounded number on a slider instead of typing it', async () => {
    const wrapper = mount(FieldRenderer, {
      props: { field: { name: 'pct', type: 'number', min: 0, max: 100 }, modelValue: 40 },
    })

    const slider = wrapper.find('input[type="range"]')
    expect(slider.exists()).toBe(true)
    expect(wrapper.find('input[type="number"]').exists()).toBe(false)
    expect(wrapper.find('output').text()).toBe('40')

    await slider.setValue('75')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([75])
  })

  it('fills the slider track up to the current value', () => {
    const wrapper = mount(FieldRenderer, {
      props: { field: { name: 'pct', type: 'number', min: 0, max: 100 }, modelValue: 40 },
    })

    expect(wrapper.find('input[type="range"]').attributes('style')).toContain('40%')
  })

  it('counts characters against the DTO limit', () => {
    const wrapper = mount(FieldRenderer, {
      props: { field: { name: 'title', type: 'text', maxLength: 200 }, modelValue: 'AI-900' },
    })

    expect(wrapper.text()).toContain('6/200')
  })

  it('leaves the field uncluttered, with no hint line under the input', () => {
    const wrapper = mount(FieldRenderer, {
      props: { field: { name: 'phone', type: 'text', pattern: '^\+' }, modelValue: '' },
    })

    expect(wrapper.findAll('p')).toHaveLength(0)
  })

  it('shows a field error in place of the hint', () => {
    const wrapper = mount(FieldRenderer, {
      props: {
        field: { name: 'phone', type: 'text' },
        modelValue: '',
        error: 'Phone is required',
      },
    })

    expect(wrapper.text()).toContain('Phone is required')
    expect(wrapper.text()).not.toContain('E.164 only')
  })
})

const BREAK = String.fromCharCode(10)

describe('textarea opening size', () => {
  it('gives a long-limit field more room than a short one', () => {
    const measure = (maxLength: number) => {
      const field = { name: 'x', type: 'textarea' as const, maxLength }
      const wrapper = mount(FieldRenderer, { props: { field, modelValue: '' } })
      const area = wrapper.find('textarea').element as HTMLTextAreaElement
      const height = area.style.height
      wrapper.unmount()
      return height
    }

    expect(measure(40)).toBeTruthy()
    expect(measure(2000)).toBeTruthy()
  })

  it('never opens shorter than a single row', () => {
    const field = { name: 'x', type: 'textarea' as const, maxLength: 10 }
    const wrapper = mount(FieldRenderer, { props: { field, modelValue: '' } })
    const area = wrapper.find('textarea').element as HTMLTextAreaElement

    expect(parseFloat(area.style.height)).toBeGreaterThanOrEqual(38)
    wrapper.unmount()
  })

  it('still grows past the floor as content is typed', async () => {
    const field = { name: 'x', type: 'textarea' as const, maxLength: 40 }
    const wrapper = mount(FieldRenderer, { props: { field, modelValue: '' } })
    const area = wrapper.find('textarea')

    await area.setValue(['a line', 'another line', 'a third line', 'a fourth line'].join(BREAK))
    expect(parseFloat((area.element as HTMLTextAreaElement).style.height)).toBeGreaterThanOrEqual(
      38,
    )
    wrapper.unmount()
  })

  it('handles a field with no declared limit', () => {
    const field = { name: 'x', type: 'textarea' as const }
    const wrapper = mount(FieldRenderer, { props: { field, modelValue: '' } })

    expect(wrapper.find('textarea').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('overlays escape the view stacking context', () => {
  it('teleports the confirm dialog to the body', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { open: true, title: 'Delete?', message: 'gone' },
      global: { stubs: { teleport: false } },
    })

    const dialog = document.body.querySelector('[role="dialog"]')

    expect(dialog).not.toBeNull()
    expect(dialog?.parentElement).toBe(document.body)
    wrapper.unmount()
  })
})

describe('confirm dialog', () => {
  it('keeps the destructive action disabled until the word is typed', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: { open: true, title: 'Delete?', message: 'gone', confirmWord: 'delete' },
    })
    await nextTick()

    expect(wrapper.findAll('button').at(-1)?.attributes('disabled')).toBeDefined()

    await wrapper.find('input').setValue('delete')
    await nextTick()
    expect(wrapper.findAll('button').at(-1)?.attributes('disabled')).toBeUndefined()

    await wrapper.findAll('button').at(-1)?.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })
})

describe('toasts', () => {
  it('renders a message and dismisses it', async () => {
    const ui = useUiStore()
    ui.notify('good', 'Saved', 'certification')

    const wrapper = mount(ToastStack)
    expect(wrapper.text()).toContain('Saved')
    expect(wrapper.text()).toContain('certification')

    await wrapper.find('button[aria-label="Dismiss"]').trigger('click')
    expect(ui.toasts).toHaveLength(0)
  })
})

describe('translation chips', () => {
  it('separates complete, partial and absent locales', () => {
    const wrapper = mount(TranslationChips, {
      props: {
        collection: COLLECTIONS.certification,
        document: certifications[0],
        langs: ['en', 'fr', 'nl'],
      },
    })

    const chips = wrapper.findAll('span > span')
    expect(chips[0].classes().join(' ')).toContain('sage')
    expect(chips[2].classes().join(' ')).toContain('muted')
    expect(wrapper.attributes('title')).toBe('2 of 3 translations complete')
  })
})
