<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <PlatformHeader
      title="Traffic"
      description="Every portfolio's audience, added together. The shape of the whole product."
      :periods="PERIODS"
      :period="period"
      @select="load"
    />

    <div v-if="loading" class="grid place-items-center py-20" role="status">
      <span
        class="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40"
      ></span>
    </div>

    <EmptyState
      v-else-if="!traffic"
      icon="Activity"
      title="No traffic yet"
      :description="error ?? 'No portfolio has been visited in this window.'"
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Visitors"
        :value="traffic.totals.visitors.toLocaleString()"
        :delta="traffic.deltas.visitors"
        :hint="`vs previous ${traffic.days} days`"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Sessions"
        :value="traffic.totals.sessions.toLocaleString()"
        :delta="traffic.deltas.sessions"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Documents opened"
        :value="traffic.totals.docs.toLocaleString()"
        :delta="traffic.deltas.docs"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Bounced"
        :value="`${bounceRate}%`"
        hint="under ten seconds"
      />

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        title="Sessions"
        :hint="`${traffic.from} → ${traffic.to}`"
      >
        <SparkLine :points="trend" unit="sessions" label="Sessions" />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        title="Where they came from"
      >
        <BarRows
          :rows="referrers"
          :slots="ROW_BUDGET.referrers"
          show-share
          empty="No referrer recorded yet"
        />
      </PanelCard>

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        title="How far they get"
        hint="every portfolio, added together"
      >
        <FunnelColumns :rows="traffic.sections" :sessions="traffic.totals.sessions" />
      </PanelCard>

      <PanelCard
        class="col-span-3 max-1000:col-span-3 max-600:col-span-2"
        title="What they read on"
      >
        <DonutChart :rows="traffic.devices" label="Devices" empty="No device data yet" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        title="Where they are"
        hint="top countries"
      >
        <BarRows
          :rows="countries"
          :slots="ROW_BUDGET.countries"
          show-share
          empty="No country data yet"
        />
      </PanelCard>

      <PanelCard class="col-span-3 max-1000:col-span-3 max-600:col-span-2" title="Which browser">
        <DonutChart :rows="traffic.browsers" label="Browsers" empty="No browser data yet" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        title="Which language"
        hint="sessions per locale"
      >
        <StackedBar :rows="langs" empty="No language data yet" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        title="Do people come back"
        hint="needs the visitor's consent"
      >
        <SplitStat
          :rows="returningSplit"
          empty="Nobody has returned yet — this fills once an owner enables enhanced measurement and a visitor accepts"
        />
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import PlatformHeader from '@/components/layout/PlatformHeader.vue'
import BarRows from '@/components/charts/BarRows.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import FunnelColumns from '@/components/charts/FunnelColumns.vue'
import SparkLine from '@/components/charts/SparkLine.vue'
import SplitStat from '@/components/charts/SplitStat.vue'
import StackedBar from '@/components/charts/StackedBar.vue'
import StatTile from '@/components/charts/StatTile.vue'
import { foldOther } from '@/utils/breakdown'
import { fetchPlatformTraffic } from '@/services/admin.api'
import type { AnalyticsSummary } from '@/types/analytics'

const PERIODS = [7, 30, 90]
const ROW_BUDGET = { referrers: 6, countries: 6, langs: 4 } as const

const traffic = ref<AnalyticsSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const period = ref(30)

const trend = computed(() =>
  (traffic.value?.trend ?? []).map((point) => ({ date: point.date, value: point.sessions })),
)

const referrers = computed(() => foldOther(traffic.value?.referrers ?? [], ROW_BUDGET.referrers))
const countries = computed(() => foldOther(traffic.value?.countries ?? [], ROW_BUDGET.countries))
const returningSplit = computed(() => {
  const returning = traffic.value?.returning ?? 0
  const fresh = traffic.value?.newVisitors ?? 0
  if (returning + fresh === 0) return []

  return [
    { key: 'returning', count: returning },
    { key: 'first visit', count: fresh },
  ]
})
const langs = computed(() => foldOther(traffic.value?.langs ?? [], ROW_BUDGET.langs))

const bounceRate = computed(() => {
  const totals = traffic.value?.totals
  if (!totals || totals.sessions === 0) return 0
  return Math.round((totals.bounced / totals.sessions) * 100)
})

async function load(days: number = period.value): Promise<void> {
  period.value = days
  loading.value = true
  error.value = null

  try {
    traffic.value = await fetchPlatformTraffic(days)
  } catch (e) {
    traffic.value = null
    error.value = e instanceof Error ? e.message : 'Traffic is not available'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>
