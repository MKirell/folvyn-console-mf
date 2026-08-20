import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePointerReorder } from '@/composables/useRowReorder'

function rows(count: number): HTMLElement[] {
  return Array.from({ length: count }, (_, index) => {
    const row = document.createElement('li')
    row.setAttribute('data-row-index', String(index))

    const handle = document.createElement('span')
    row.appendChild(handle)
    document.body.appendChild(row)
    return handle
  })
}

function pointsAt(element: Element): void {
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => element,
  })
}

function pointer(type: string, x = 0, y = 0): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1 })
}

describe('usePointerReorder', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('tracks the row under the pointer and commits on release', async () => {
    const handles = rows(3)
    const dragIndex = ref(-1)
    const overIndex = ref(-1)
    const commit = vi.fn()
    const { onHandleDown } = usePointerReorder(dragIndex, overIndex, commit)

    handles[0].addEventListener('pointerdown', (event) => onHandleDown(0, event as PointerEvent))
    handles[0].dispatchEvent(pointer('pointerdown'))

    expect(dragIndex.value).toBe(0)
    expect(overIndex.value).toBe(0)

    pointsAt(handles[2])
    handles[0].dispatchEvent(pointer('pointermove', 10, 90))
    expect(overIndex.value).toBe(2)

    handles[0].dispatchEvent(pointer('pointerup'))
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('keeps the last row when the pointer leaves every row', () => {
    const handles = rows(2)
    const dragIndex = ref(-1)
    const overIndex = ref(-1)
    const { onHandleDown } = usePointerReorder(dragIndex, overIndex, vi.fn())

    handles[1].addEventListener('pointerdown', (event) => onHandleDown(1, event as PointerEvent))
    handles[1].dispatchEvent(pointer('pointerdown'))

    pointsAt(document.body)
    handles[1].dispatchEvent(pointer('pointermove', 0, 999))

    expect(overIndex.value).toBe(1)
  })

  it('clears the drag and does not commit when the gesture is cancelled', () => {
    const handles = rows(2)
    const dragIndex = ref(-1)
    const overIndex = ref(-1)
    const commit = vi.fn()
    const { onHandleDown } = usePointerReorder(dragIndex, overIndex, commit)

    handles[0].addEventListener('pointerdown', (event) => onHandleDown(0, event as PointerEvent))
    handles[0].dispatchEvent(pointer('pointerdown'))
    handles[0].dispatchEvent(pointer('pointercancel'))

    expect(dragIndex.value).toBe(-1)
    expect(overIndex.value).toBe(-1)
    expect(commit).not.toHaveBeenCalled()
  })

  it('stops listening once the gesture ends', () => {
    const handles = rows(3)
    const dragIndex = ref(-1)
    const overIndex = ref(-1)
    const { onHandleDown } = usePointerReorder(dragIndex, overIndex, vi.fn())

    handles[0].addEventListener('pointerdown', (event) => onHandleDown(0, event as PointerEvent))
    handles[0].dispatchEvent(pointer('pointerdown'))
    handles[0].dispatchEvent(pointer('pointerup'))

    pointsAt(handles[2])
    handles[0].dispatchEvent(pointer('pointermove', 10, 90))

    expect(overIndex.value).toBe(0)
  })

  it('ignores a non-primary mouse button but accepts touch', () => {
    const handles = rows(2)
    const dragIndex = ref(-1)
    const overIndex = ref(-1)
    const { onHandleDown } = usePointerReorder(dragIndex, overIndex, vi.fn())

    const right = new PointerEvent('pointerdown', { button: 2, pointerType: 'mouse' })
    Object.defineProperty(right, 'currentTarget', { value: handles[0] })
    onHandleDown(0, right)
    expect(dragIndex.value).toBe(-1)

    const touch = new PointerEvent('pointerdown', { button: 0, pointerType: 'touch' })
    Object.defineProperty(touch, 'currentTarget', { value: handles[1] })
    onHandleDown(1, touch)
    expect(dragIndex.value).toBe(1)
  })
})
