import type { Directive } from 'vue'

const PAGE_WIDTH = 820

const observers = new WeakMap<HTMLElement, ResizeObserver>()

function rescale(el: HTMLElement): void {
  const host = el.parentElement
  if (!host) return

  const width = host.clientWidth
  if (width > 0) el.style.setProperty('--page-thumb-scale', String(width / PAGE_WIDTH))
}

export const pageThumb: Directive<HTMLElement> = {
  mounted(el) {
    rescale(el)

    const host = el.parentElement
    if (!host || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => rescale(el))
    observer.observe(host)
    observers.set(el, observer)
  },
  updated(el) {
    rescale(el)
  },
  unmounted(el) {
    observers.get(el)?.disconnect()
    observers.delete(el)
  },
}
