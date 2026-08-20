import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObjectDirective } from 'vue'
import { pageThumb } from '@/directives/page-thumb'

const PAGE_WIDTH = 820

function tile(width: number): HTMLIFrameElement {
  const host = document.createElement('span')
  Object.defineProperty(host, 'clientWidth', { configurable: true, value: width })

  const frame = document.createElement('iframe')
  host.appendChild(frame)
  document.body.appendChild(host)
  return frame
}

const directive = pageThumb as ObjectDirective<HTMLElement>

function scaleOf(el: HTMLElement): string {
  return el.style.getPropertyValue('--page-thumb-scale')
}

function mount(el: HTMLElement): void {
  directive.mounted?.(el, {} as never, {} as never, null)
}

describe('pageThumb', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('scales a page down to the width of its tile', () => {
    const frame = tile(193)
    mount(frame)

    expect(Number(scaleOf(frame))).toBeCloseTo(193 / PAGE_WIDTH, 5)
  })

  it('rescales when the tile is resized', () => {
    const observed: Array<() => void> = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          observed.push(callback)
        }
        observe(): void {}
        disconnect(): void {}
      },
    )

    const frame = tile(200)
    mount(frame)
    expect(Number(scaleOf(frame))).toBeCloseTo(200 / PAGE_WIDTH, 5)

    const host = frame.parentElement as HTMLElement
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 400 })
    observed.forEach((callback) => callback())

    expect(Number(scaleOf(frame))).toBeCloseTo(400 / PAGE_WIDTH, 5)
  })

  it('leaves the fallback scale in place while the tile has no width', () => {
    const frame = tile(0)
    mount(frame)

    expect(scaleOf(frame)).toBe('')
  })

  it('does nothing when the frame has no tile around it', () => {
    const orphan = document.createElement('iframe')
    expect(() => mount(orphan)).not.toThrow()
    expect(scaleOf(orphan)).toBe('')
  })

  it('stops observing when the frame goes away', () => {
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        disconnect = disconnect
      },
    )

    const frame = tile(200)
    mount(frame)
    directive.unmounted?.(frame, {} as never, {} as never, null)

    expect(disconnect).toHaveBeenCalledTimes(1)
  })
})
