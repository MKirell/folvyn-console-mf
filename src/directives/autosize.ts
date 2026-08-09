import type { Directive, DirectiveBinding } from 'vue'

const MIN_HEIGHT = 38
const MAX_ROWS = 8
const SAMPLE = 'abcdefghijklmnopqrstuvwxyz ,.'

const floors = new WeakMap<HTMLTextAreaElement, number>()
const observers = new WeakMap<HTMLTextAreaElement, ResizeObserver>()

let ruler: CanvasRenderingContext2D | null | undefined

function measurer(): CanvasRenderingContext2D | null {
  if (ruler !== undefined) return ruler
  ruler = document.createElement('canvas').getContext('2d')
  return ruler
}

function averageCharWidth(style: CSSStyleDeclaration): number {
  const context = measurer()
  if (!context) return 0

  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const width = context.measureText(SAMPLE).width
  return width > 0 ? width / SAMPLE.length : 0
}

function floorFor(el: HTMLTextAreaElement, maxLength: number): number {
  if (!maxLength || typeof getComputedStyle !== 'function') return MIN_HEIGHT

  const style = getComputedStyle(el)
  const charWidth = averageCharWidth(style)
  if (!charWidth) return MIN_HEIGHT

  const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
  const usable = el.clientWidth - padding
  if (usable <= 0) return MIN_HEIGHT

  const perLine = Math.max(1, Math.floor(usable / charWidth))
  const rows = Math.min(MAX_ROWS, Math.max(1, Math.ceil(maxLength / perLine)))

  const fontSize = parseFloat(style.fontSize) || 13
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.55
  const vertical = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
  const chrome = el.offsetHeight - el.clientHeight

  return Math.max(MIN_HEIGHT, Math.ceil(rows * lineHeight + vertical + chrome))
}

export function resizeToContent(el: HTMLTextAreaElement): void {
  el.style.height = 'auto'
  const chrome = el.offsetHeight - el.clientHeight
  const floor = floors.get(el) ?? MIN_HEIGHT
  el.style.height = `${Math.max(el.scrollHeight + chrome, floor, MIN_HEIGHT)}px`
}

function remeasure(el: HTMLTextAreaElement, binding: DirectiveBinding<number | undefined>): void {
  floors.set(el, floorFor(el, binding.value ?? 0))
  resizeToContent(el)
}

export const autosize: Directive<HTMLTextAreaElement, number | undefined> = {
  mounted(el, binding) {
    el.addEventListener('input', () => resizeToContent(el))
    remeasure(el, binding)

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => remeasure(el, binding))
    observer.observe(el)
    observers.set(el, observer)
  },
  updated(el, binding) {
    remeasure(el, binding)
  },
  unmounted(el) {
    observers.get(el)?.disconnect()
    observers.delete(el)
  },
}
