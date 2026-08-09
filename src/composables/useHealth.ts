import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { fetchHealth } from '@/services/admin.api'

const POLL_MS = 60_000

export type HealthState = 'unknown' | 'up' | 'down'

export interface UseHealth {
  state: Ref<HealthState>
  checkedAt: Ref<number>
  check: () => Promise<void>
}

export function useHealth(): UseHealth {
  const state = ref<HealthState>('unknown')
  const checkedAt = ref(0)
  let timer = 0

  async function check(): Promise<void> {
    try {
      await fetchHealth()
      state.value = 'up'
    } catch {
      state.value = 'down'
    } finally {
      checkedAt.value = Date.now()
    }
  }

  onMounted(() => {
    void check()
    timer = window.setInterval(() => void check(), POLL_MS)
  })

  onUnmounted(() => clearInterval(timer))

  return { state, checkedAt, check }
}
