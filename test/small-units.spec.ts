import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useHistoryStore } from '@/stores/history'
import { useHealth } from '@/composables/useHealth'
import {
  clearSnapshots,
  listSnapshots,
  purgeExpiredSnapshots,
  putSnapshot,
} from '@/services/snapshots'
import * as api from '@/services/admin.api'

const DAY = 86_400_000

function snapshot(id: string, savedAt: number) {
  return {
    id,
    collection: 'certification',
    documentId: id,
    label: id,
    savedAt,
    document: { title: id },
  }
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await clearSnapshots()
})

describe('the undo history', () => {
  it('has nothing to undo until something is recorded', () => {
    const history = useHistoryStore()

    expect(history.canUndo).toBe(false)
    expect(history.nextLabel).toBe('')
  })

  it('undoes the most recent thing first', async () => {
    const history = useHistoryStore()
    const order: string[] = []

    history.record('first', async () => void order.push('first'))
    history.record('second', async () => void order.push('second'))

    expect(history.nextLabel).toBe('second')
    await expect(history.undo()).resolves.toBe('second')
    expect(order).toEqual(['second'])
  })

  it('answers null when there is nothing left to undo', async () => {
    const history = useHistoryStore()

    await expect(history.undo()).resolves.toBeNull()
  })

  it('keeps the entry when undoing it fails, so it can be tried again', async () => {
    const history = useHistoryStore()
    history.record('doomed', () => Promise.reject(new Error('nope')))

    await expect(history.undo()).rejects.toThrow('nope')
    expect(history.canUndo).toBe(true)
  })

  it('forgets everything when cleared', () => {
    const history = useHistoryStore()
    history.record('one', async () => {})
    history.clear()

    expect(history.canUndo).toBe(false)
  })
})

describe('editor snapshots', () => {
  it('reads back what it stored, newest first', async () => {
    await putSnapshot(snapshot('a', Date.now() - 1000))
    await putSnapshot(snapshot('b', Date.now()))

    const all = await listSnapshots()
    expect(all.map((entry) => entry.id)).toEqual(['b', 'a'])
  })

  it('hides an entry older than the retention window', async () => {
    await putSnapshot(snapshot('old', Date.now() - 40 * DAY))
    await putSnapshot(snapshot('fresh', Date.now()))

    const all = await listSnapshots()
    expect(all.map((entry) => entry.id)).toEqual(['fresh'])
  })

  it('purges what it has stopped showing', async () => {
    await putSnapshot(snapshot('old', Date.now() - 40 * DAY))
    await purgeExpiredSnapshots()

    await expect(listSnapshots()).resolves.toEqual([])
  })

  it('clears everything on request', async () => {
    await putSnapshot(snapshot('a', Date.now()))
    await clearSnapshots()

    await expect(listSnapshots()).resolves.toEqual([])
  })
})

describe('the API health pill', () => {
  function host() {
    return defineComponent({
      setup() {
        const health = useHealth()
        return () => h('span', health.state.value)
      },
    })
  }

  it('reads up when the API answers', async () => {
    vi.mocked(api.fetchHealth).mockResolvedValue({ status: 'ok' } as never)
    const wrapper = mount(host())

    await vi.waitFor(() => expect(wrapper.text()).toBe('up'))
    wrapper.unmount()
  })

  it('reads down when the API does not', async () => {
    vi.mocked(api.fetchHealth).mockRejectedValue(new Error('offline'))
    const wrapper = mount(host())

    await vi.waitFor(() => expect(wrapper.text()).toBe('down'))
    wrapper.unmount()
  })
})
