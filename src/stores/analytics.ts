import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchAnalyticsSummary } from '@/services/admin.api'
import type { AnalyticsSummary } from '@/types/analytics'

export const PERIODS = [7, 30, 90] as const

export type Period = (typeof PERIODS)[number]

export const useAnalyticsStore = defineStore('analytics', () => {
  const cache = new Map<number, AnalyticsSummary>()
  const summary = ref<AnalyticsSummary | null>(null)
  const period = ref<Period>(30)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(days: Period = period.value, force = false): Promise<void> {
    period.value = days

    const cached = cache.get(days)
    if (cached && !force) {
      summary.value = cached
      return
    }

    loading.value = true
    error.value = null

    try {
      const loaded = await fetchAnalyticsSummary(days)
      cache.set(days, loaded)
      summary.value = loaded
    } catch (e) {
      summary.value = null
      error.value = e instanceof Error ? e.message : 'Analytics are not available yet'
    } finally {
      loading.value = false
    }
  }

  return { summary, period, loading, error, load }
})
