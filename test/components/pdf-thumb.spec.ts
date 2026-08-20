import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PdfThumb from '@/components/ui/PdfThumb.vue'

const render = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }))
const getPage = vi.fn()
const destroy = vi.fn(() => Promise.resolve())

function viewport(scale: number) {
  return { width: 612 * scale, height: 792 * scale }
}

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: (...args: unknown[]) => {
    getPage(...args)
    return {
      promise: Promise.resolve({
        getPage: () =>
          Promise.resolve({
            getViewport: ({ scale }: { scale: number }) => viewport(scale),
            render,
          }),
      }),
      destroy,
    }
  },
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.js' }))

let tileWidth = 0

Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get: () => tileWidth,
})

HTMLCanvasElement.prototype.getContext =
  (() => ({})) as unknown as typeof HTMLCanvasElement.prototype.getContext

function tile(width: number) {
  tileWidth = width
  const host = document.createElement('span')
  document.body.appendChild(host)
  return host
}

async function settle(): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe('PdfThumb', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
    vi.stubGlobal('IntersectionObserver', undefined)
  })

  it('draws the first page at the width of its tile', async () => {
    const host = tile(200)
    mount(PdfThumb, { props: { src: '/a.pdf' }, attachTo: host })
    await settle()

    expect(getPage).toHaveBeenCalledWith({ url: '/a.pdf' })
    const [{ viewport: used }] = render.mock.calls[0] as unknown as [
      { viewport: { width: number } },
    ]
    expect(Math.round(used.width)).toBe(200 * Math.min(window.devicePixelRatio || 1, 2))
  })

  it('keeps the page proportions whatever the tile width', async () => {
    const host = tile(400)
    mount(PdfThumb, { props: { src: '/a.pdf' }, attachTo: host })
    await settle()

    const [{ viewport: used }] = render.mock.calls[0] as unknown as [
      { viewport: { width: number; height: number } },
    ]
    expect(used.height / used.width).toBeCloseTo(792 / 612, 4)
  })

  it('does not draw without a source', async () => {
    const host = tile(200)
    mount(PdfThumb, { props: { src: undefined }, attachTo: host })
    await settle()

    expect(getPage).not.toHaveBeenCalled()
  })

  it('does not draw into a tile that has no width yet', async () => {
    const host = tile(0)
    mount(PdfThumb, { props: { src: '/a.pdf' }, attachTo: host })
    await settle()

    expect(getPage).not.toHaveBeenCalled()
  })

  it('waits for the tile to come into view when it can observe', async () => {
    const observed: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
          observed.push(callback)
        }
        observe(): void {}
        disconnect(): void {}
      },
    )

    const host = tile(200)
    mount(PdfThumb, { props: { src: '/a.pdf' }, attachTo: host })
    await settle()
    expect(getPage).not.toHaveBeenCalled()

    observed[0]([{ isIntersecting: true }])
    await settle()
    expect(getPage).toHaveBeenCalledTimes(1)
  })

  it('falls back to an icon when the document cannot be read', async () => {
    render.mockImplementationOnce(() => {
      throw new Error('broken')
    })

    const host = tile(200)
    const wrapper = mount(PdfThumb, { props: { src: '/a.pdf' }, attachTo: host })
    await settle()

    expect(wrapper.find('svg').exists()).toBe(true)
  })
})

describe('PdfThumb when the tile has no width yet', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('draws once the tile is measured rather than giving up', async () => {
    const resizes: Array<() => void> = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resizes.push(callback)
        }
        observe(): void {}
        disconnect(): void {}
      },
    )
    vi.stubGlobal('IntersectionObserver', undefined)

    const host = tile(0)
    mount(PdfThumb, { props: { src: '/a.pdf' }, attachTo: host })
    await settle()
    expect(getPage).not.toHaveBeenCalled()

    tileWidth = 240
    resizes.forEach((callback) => callback())
    await settle()

    expect(getPage).toHaveBeenCalledTimes(1)
  })
})
