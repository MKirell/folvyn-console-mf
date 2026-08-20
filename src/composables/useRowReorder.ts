import type { Ref } from 'vue'

export function usePointerReorder(
  dragIndex: Ref<number>,
  overIndex: Ref<number>,
  commit: () => void | Promise<void>,
) {
  function rowUnder(event: PointerEvent): number {
    const element = document.elementFromPoint(event.clientX, event.clientY)
    const index = element?.closest('[data-row-index]')?.getAttribute('data-row-index')
    return index === null || index === undefined ? -1 : Number(index)
  }

  function onHandleDown(index: number, event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType === 'mouse') return

    event.preventDefault()
    dragIndex.value = index
    overIndex.value = index

    const handle = event.currentTarget as HTMLElement
    handle.setPointerCapture?.(event.pointerId)

    const onMove = (moved: PointerEvent): void => {
      const over = rowUnder(moved)
      if (over >= 0) overIndex.value = over
    }

    const detach = (): void => {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onCancel)
    }

    const onUp = (): void => {
      detach()
      void commit()
    }

    const onCancel = (): void => {
      detach()
      dragIndex.value = -1
      overIndex.value = -1
    }

    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
    handle.addEventListener('pointercancel', onCancel)
  }

  return { onHandleDown }
}
