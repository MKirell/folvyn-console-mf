<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <PlatformHeader
      :title="t('platform.healthTitle')"
      :description="t('platform.health.blurb')"
      :periods="PERIODS"
      :period="period"
      @select="load"
    />

    <SkeletonGrid v-if="loading" :panels="[8, 4, 12, 8, 4]" :label="t('platform.healthTitle')" />

    <EmptyState v-else-if="error" icon="Shield" :title="t('errors.health')" :description="error">
      <AppButton variant="primary" @click="load(period)">{{ t('common.retry') }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="!health"
      icon="Activity"
      :title="t('platform.healthUnavailable')"
      :description="t('common.unreachableDesc')"
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.health.database')"
        :value="health.database"
        :hint="health.database === 'up' ? 'accepting queries' : 'the API is degraded'"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.health.errorRate')"
        :value="`${health.errorRate}%`"
        :hint="t('platform.health.errorsPerSession')"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.health.storage')"
        :value="`${used} MB`"
        :hint="`${health.storage.share}% of the ${health.storage.ceilingMb} MB tier`"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.health.renders')"
        :value="renderState"
        :hint="renderHint"
      />

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.waitedFor')"
        hint="p75 across every portfolio"
      >
        <ul class="flex min-h-0 flex-1 flex-col justify-center gap-2" role="list">
          <li
            v-for="vital in vitals"
            :key="vital.key"
            class="flex items-center gap-3 rounded-[9px] border px-3 py-2"
            :class="vital.tone"
          >
            <component
              :is="vital.good ? CircleCheck : TriangleAlert"
              :size="15"
              :stroke-width="1.9"
              class="shrink-0"
            />
            <span class="w-12 shrink-0 font-mono text-[0.72rem] uppercase">{{ vital.key }}</span>
            <span class="min-w-0 flex-1 text-[0.78rem]">{{ vital.meaning }}</span>
            <span class="shrink-0 font-mono text-[0.78rem] tabular-nums">{{ vital.display }}</span>
          </li>
        </ul>
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.storageCeiling')"
        :hint="t('platform.health.atlasTier')"
      >
        <div class="flex min-h-0 flex-1 flex-col justify-center gap-3">
          <div>
            <div class="mb-1 flex items-baseline gap-2">
              <span class="min-w-0 flex-1 text-[0.78rem]">{{
                t('platform.health.dataIndexes')
              }}</span>
              <span class="shrink-0 font-mono text-[0.72rem] tabular-nums text-ink-soft"
                >{{ used }} / {{ health.storage.ceilingMb }} MB</span
              >
            </div>
            <span class="block h-[10px] overflow-hidden rounded-full bg-bg-tint">
              <span
                class="block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                :class="health.storage.share > 80 ? 'bg-rust' : 'bg-accent'"
                :style="{ width: `${Math.max(2, health.storage.share)}%` }"
              ></span>
            </span>
          </div>
          <BarRows :rows="collections" :slots="4" :empty="t('platform.health.noContent')" />
        </div>
      </PanelCard>

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.errorsWhose')"
        :hint="errorHint"
      >
        <ul v-if="topErrorGroups.length" class="flex min-h-0 flex-1 flex-col gap-1.5" role="list">
          <li
            v-for="group in topErrorGroups"
            :key="group.message"
            class="flex flex-wrap items-center gap-3 rounded-[9px] border border-gold/25 bg-gold/6 px-3 py-2"
          >
            <TriangleAlert :size="15" :stroke-width="1.9" class="shrink-0 text-gold" />
            <span class="min-w-0 flex-1 truncate font-mono text-[0.76rem]" :title="group.message">{{
              group.message
            }}</span>
            <span class="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted"
              >{{ group.accounts }} account{{ group.accounts === 1 ? '' : 's' }}</span
            >
            <span class="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted"
              >{{ group.firstSeen }} → {{ group.lastSeen }}</span
            >
            <span class="w-12 shrink-0 text-end font-mono text-[0.76rem] tabular-nums">{{
              group.count.toLocaleString()
            }}</span>
          </li>
        </ul>
        <div v-else class="grid flex-1 place-items-center py-6 text-center">
          <div>
            <p class="text-[0.86rem] text-ink">{{ t('platform.health.noErrors') }}</p>
            <p class="mt-1 max-w-[52ch] text-[0.78rem] text-muted">
              Grouped by message, so one broken deploy is one row across many accounts.
            </p>
          </div>
        </div>
      </PanelCard>

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.rawEvents')"
        :hint="`a day, last ${period} days`"
      >
        <VolumeColumns
          :points="volume"
          unit="events"
          :empty="t('platform.health.nothingWritten')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.retention')"
        :hint="t('platform.health.ttl')"
      >
        <ul class="flex min-h-0 flex-1 flex-col justify-center gap-2" role="list">
          <li
            v-for="index in ingest?.ttl ?? []"
            :key="index.collection"
            class="flex items-center gap-3 rounded-[9px] border px-3 py-2"
            :class="index.present ? 'border-sage/25 bg-sage/6' : 'border-rust/25 bg-rust/6'"
          >
            <component
              :is="index.present ? CircleCheck : TriangleAlert"
              :size="15"
              :stroke-width="1.9"
              class="shrink-0"
              :class="index.present ? 'text-sage' : 'text-rust'"
            />
            <span class="min-w-0 flex-1 truncate font-mono text-[0.74rem]">{{
              index.collection
            }}</span>
            <span class="shrink-0 font-mono text-[0.7rem] text-muted">{{ ttlLabel(index) }}</span>
          </li>

          <li class="flex items-center gap-3 rounded-[9px] border border-line/8 bg-bg px-3 py-2">
            <span class="min-w-0 flex-1 truncate text-[0.76rem]">{{
              t('platform.health.rollupLag')
            }}</span>
            <span class="shrink-0 font-mono text-[0.72rem] text-muted">{{ lag }}</span>
          </li>

          <li class="flex items-center gap-3 rounded-[9px] border border-line/8 bg-bg px-3 py-2">
            <span class="min-w-0 flex-1 truncate text-[0.76rem]">{{
              t('platform.health.beacons')
            }}</span>
            <span class="shrink-0 font-mono text-[0.72rem] tabular-nums text-muted">{{
              (ingest?.totals.rejected ?? 0).toLocaleString()
            }}</span>
          </li>
        </ul>
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CircleCheck, TriangleAlert } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import SkeletonGrid from '@/components/ui/SkeletonGrid.vue'
import PlatformHeader from '@/components/layout/PlatformHeader.vue'
import BarRows from '@/components/charts/BarRows.vue'
import VolumeColumns from '@/components/charts/VolumeColumns.vue'
import StatTile from '@/components/charts/StatTile.vue'
import { foldOther } from '@/utils/breakdown'
import { fetchIngestReport, fetchPlatformHealth } from '@/services/admin.api'
import type { IngestReport, PlatformHealth } from '@/types/analytics'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const PERIODS = [7, 30, 90]

const VITALS = [
  { key: 'lcp', meaning: 'Time to the main content', good: 2500, unit: 'ms' },
  { key: 'inp', meaning: 'Delay before the page answers a tap', good: 200, unit: 'ms' },
  { key: 'cls', meaning: 'How much the layout jumps', good: 100, unit: '' },
  { key: 'ttfb', meaning: 'Time to the first byte', good: 800, unit: 'ms' },
] as const

const health = ref<PlatformHealth | null>(null)
const ingest = ref<IngestReport | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const period = ref(30)

const used = computed(
  () =>
    Math.round(((health.value?.storage.dataMb ?? 0) + (health.value?.storage.indexMb ?? 0)) * 10) /
    10,
)

const collections = computed(() => foldOther(health.value?.storage.collections ?? [], 4))

const volume = computed(() =>
  (ingest.value?.days ?? []).map((row) => ({ date: row.date, value: row.events })),
)

const ERROR_ROWS = 2

const topErrorGroups = computed(() => (health.value?.errorGroups ?? []).slice(0, ERROR_ROWS))

const errorHint = computed(() => {
  const groups = health.value?.errorGroups ?? []
  if (groups.length <= ERROR_ROWS) return 'grouped by message'
  return `${groups.length - ERROR_ROWS} more, grouped by message`
})

const renderState = computed(() => {
  const prerender = health.value?.prerender
  if (!prerender?.configured) return 'off'
  return prerender.failing > 0 ? String(prerender.failing) : 'ok'
})

const renderHint = computed(() => {
  const prerender = health.value?.prerender
  if (!prerender?.configured) return 'no renderer in this environment'
  if (prerender.failing > 0) return 'portfolios whose page is stale'
  return `${prerender.attempts.length} recent, none failing`
})

const vitals = computed(() =>
  VITALS.map((vital) => {
    const value = health.value?.vitals[vital.key] ?? null
    const good = value === null || value <= vital.good

    return {
      ...vital,
      good,
      display: value === null ? 'not measured' : `${value}${vital.unit}`,
      tone: good ? 'border-sage/25 bg-sage/6 text-sage' : 'border-gold/25 bg-gold/6 text-gold',
    }
  }),
)

const lag = computed(() => {
  const latest = ingest.value?.lag.latestRollup
  const today = ingest.value?.lag.today
  if (!latest) return 'no rollup yet'
  return latest === today ? 'current' : `newest is ${latest}`
})

function ttlLabel(index: IngestReport['ttl'][number]): string {
  if (!index.present) return 'no TTL — rows never expire'
  return `${Math.round((index.seconds ?? 0) / 86_400)} days`
}

async function load(days: number = period.value): Promise<void> {
  period.value = days
  loading.value = true
  error.value = null

  try {
    const [reportedHealth, reportedIngest] = await Promise.all([
      fetchPlatformHealth(days),
      fetchIngestReport(days).catch(() => null),
    ])
    health.value = reportedHealth
    ingest.value = reportedIngest
  } catch (e) {
    health.value = null
    error.value = e instanceof Error ? e.message : 'Health is not available'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>
