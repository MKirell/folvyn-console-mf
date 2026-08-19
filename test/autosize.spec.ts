import { beforeEach, describe, expect, it, vi } from 'vitest'
import { autosize } from '@/directives/autosize'
import type { DirectiveBinding, ObjectDirective } from 'vue'

const CHAR_WIDTH = 7
const WIDTH = 400

function textarea(): HTMLTextAreaElement {
  const el = document.createElement('textarea')

  Object.defineProperty(el, 'clientWidth', { configurable: true, value: WIDTH })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: 0 })
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 0 })
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 0 })

  document.body.appendChild(el)
  return el
}

const directive = autosize as ObjectDirective<HTMLTextAreaElement, number | undefined>

function mount(el: HTMLTextAreaElement, maxLength: number | undefined): number {
  directive.mounted?.(
    el,
    { value: maxLength } as DirectiveBinding<number | undefined>,
    null!,
    null!,
  )
  return parseFloat(el.style.height)
}

describe('autosize opens a field at the size its limit implies', () => {
  beforeEach(() => {
    document.body.innerHTML = ''

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: (text: string) => ({ width: text.length * CHAR_WIDTH }),
    } as unknown as CanvasRenderingContext2D)

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      fontWeight: '400',
      fontSize: '13px',
      fontFamily: 'sans-serif',
      lineHeight: '20px',
      paddingLeft: '12px',
      paddingRight: '12px',
      paddingTop: '8px',
      paddingBottom: '8px',
    } as unknown as CSSStyleDeclaration)
  })

  it('gives a long limit more rows than a short one', () => {
    const short = mount(textarea(), 40)
    const long = mount(textarea(), 2000)

    expect(long).toBeGreaterThan(short)
  })

  it('never opens shorter than a single-line input', () => {
    expect(mount(textarea(), 40)).toBeGreaterThanOrEqual(38)
    expect(mount(textarea(), undefined)).toBeGreaterThanOrEqual(38)
  })

  it('caps the opening height so one field cannot own the screen', () => {
    const capped = mount(textarea(), 100000)
    const eight = 8 * 20 + 16

    expect(capped).toBeLessThanOrEqual(eight)
  })

  it('grows with the limit rather than jumping straight to the cap', () => {
    const medium = mount(textarea(), 320)

    expect(medium).toBeGreaterThan(38)
    expect(medium).toBeLessThan(8 * 20 + 16)
  })
})
