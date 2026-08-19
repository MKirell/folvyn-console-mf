import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import {
  clearSnapshots as wipeSnapshots,
  listSnapshots,
  purgeExpiredSnapshots,
  putSnapshot,
  type Snapshot,
} from '@/services/snapshots'

const MAX_ENTRIES = 20

export interface UndoEntry {
  id: string
  label: string
  at: number
  run: () => Promise<void>
}

export const useHistoryStore = defineStore('history', () => {
  const entries = shallowRef<UndoEntry[]>([])
  const snapshots = ref<Snapshot[]>([])
  const undoing = ref(false)

  const canUndo = computed(() => entries.value.length > 0 && !undoing.value)
  const nextLabel = computed(() => entries.value[0]?.label ?? '')

  function record(label: string, run: () => Promise<void>): void {
    const entry: UndoEntry = {
      id: crypto.randomUUID(),
      label,
      at: Date.now(),
      run,
    }
    entries.value = [entry, ...entries.value].slice(0, MAX_ENTRIES)
  }

  async function undo(): Promise<string | null> {
    const [entry, ...rest] = entries.value
    if (!entry || undoing.value) return null

    undoing.value = true
    try {
      await entry.run()
      entries.value = rest
      return entry.label
    } finally {
      undoing.value = false
    }
  }

  function clear(): void {
    entries.value = []
  }

  async function snapshot(
    collection: string,
    documentId: string,
    label: string,
    document: unknown,
  ): Promise<void> {
    await putSnapshot({
      id: `${collection}:${documentId}:${Date.now()}`,
      collection,
      documentId,
      label,
      savedAt: Date.now(),
      document,
    })
  }

  async function loadSnapshots(): Promise<void> {
    await purgeExpiredSnapshots()
    snapshots.value = await listSnapshots()
  }

  async function clearSnapshots(): Promise<void> {
    await wipeSnapshots()
    snapshots.value = []
  }

  return {
    entries,
    snapshots,
    undoing,
    canUndo,
    nextLabel,
    record,
    undo,
    clear,
    snapshot,
    loadSnapshots,
    clearSnapshots,
  }
})
