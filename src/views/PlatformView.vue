<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">
          {{ t('platform.overview.title') }}
        </h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          The whole platform at a glance. Draft content stays private to the person who wrote it.
        </p>
      </div>

      <div
        class="flex items-center gap-0.5 rounded-[9px] border border-line/8 bg-surface p-[3px]"
        role="group"
        :aria-label="t('platform.common.reportingPeriod')"
      >
        <button
          v-for="days in PERIODS"
          :key="days"
          type="button"
          class="rounded-[6px] px-2.5 py-[4px] font-mono text-[0.7rem] transition-colors motion-reduce:transition-none"
          :class="days === period ? 'bg-accent/14 text-accent-deep' : 'text-muted hover:text-ink'"
          :aria-pressed="days === period"
          @click="load(days)"
        >
          {{ days }}d
        </button>
      </div>
    </header>

    <SkeletonGrid
      v-if="loading"
      :panels="[8, 4, 12, 6, 6, 8, 4]"
      :label="t('platform.overview.title')"
    />

    <EmptyState v-else-if="error" icon="Shield" :title="t('errors.overview')" :description="error">
      <AppButton variant="primary" @click="load(period)">{{ t('common.retry') }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="!overview"
      icon="Gauge"
      :title="t('platform.overview.nothing')"
      description="No account has signed up."
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.overview.accounts')"
        :value="String(overview.owners.total)"
        :hint="`${overview.signups.last7} new this week`"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.overview.live')"
        :value="String(overview.owners.published)"
        :hint="`${publishedShare}% of accounts`"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.common.visitors')"
        :value="overview.traffic.totals.visitors.toLocaleString()"
        :delta="overview.traffic.deltas.visitors"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.common.sessions')"
        :value="overview.traffic.totals.sessions.toLocaleString()"
        :delta="overview.traffic.deltas.sessions"
      />

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.common.traffic')"
        :hint="`${overview.traffic.from} → ${overview.traffic.to}`"
      >
        <SparkLine :points="trendPoints" unit="sessions" :label="t('platform.common.sessions')" />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.whereFrom')"
        hint="top referrers"
      >
        <BarRows
          :rows="referrers"
          :slots="ROW_BUDGET.referrers"
          show-share
          :empty="t('platform.common.noReferrer')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.busy')"
        :hint="`sessions a day, ${period} days`"
      >
        <HeatCalendar :points="trendPoints" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.states')"
        hint="every account"
      >
        <DonutChart
          :rows="states"
          :label="t('platform.overview.states')"
          :empty="t('platform.overview.noAccount')"
        />
        <p v-if="overview.owners.suspended > 0" class="mt-3 text-[0.74rem] text-rust">
          {{ overview.owners.suspended }} suspended — review them under Portfolios.
        </p>
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.busiest')"
        :hint="`${overview.portfolios.length} with traffic`"
      >
        <ul
          v-if="busiest.length"
          class="grid min-h-0 flex-1 gap-1.5"
          :style="busiestRows"
          role="list"
        >
          <li
            v-for="row in busiest"
            :key="row.slug"
            class="flex items-center gap-3 rounded-[9px] border border-line/8 bg-bg px-3"
          >
            <span
              class="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-accent/12 font-mono text-[0.68rem] tabular-nums text-accent-deep"
              aria-hidden="true"
              >{{ row.rank }}</span
            >
            <a
              :href="portfolioUrl(row.slug)"
              target="_blank"
              rel="noopener noreferrer"
              class="min-w-0 flex-1 truncate font-mono text-[0.76rem] hover:text-accent-deep"
              >/{{ row.slug }}</a
            >
            <span
              class="shrink-0 rounded-[5px] px-1.5 py-[1px] font-mono text-[0.62rem] uppercase"
              :class="row.status === 'published' ? 'bg-sage/15 text-sage' : 'bg-line/10 text-muted'"
              >{{ row.status }}</span
            >
            <span class="w-14 shrink-0 text-end font-mono text-[0.74rem] tabular-nums">{{
              row.sessions.toLocaleString()
            }}</span>
          </li>
        </ul>
        <p v-else class="grid flex-1 place-items-center text-[0.8rem] text-muted">
          {{ t('platform.overview.noVisit') }}
        </p>
      </PanelCard>

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.attention')"
        :hint="needsWork === 0 ? 'all clear' : `${needsWork} of ${attention.length} need you`"
      >
        <div class="flex min-h-0 flex-1 flex-col justify-center gap-1.5">
          <ul class="flex flex-col gap-1.5" role="list">
            <li
              v-for="check in topAttention"
              :key="check.key"
              class="flex items-center gap-3 rounded-[9px] border px-3 py-2.5"
              :class="check.clear ? 'border-line/8 bg-bg' : 'border-gold/25 bg-gold/6'"
            >
              <component
                :is="check.clear ? CheckCircle2 : TriangleAlert"
                :size="15"
                :stroke-width="1.9"
                class="shrink-0"
                :class="check.clear ? 'text-sage' : 'text-gold'"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[0.8rem] font-medium">{{ check.label }}</span>
                <span class="block truncate text-[0.74rem] text-muted">{{ check.detail }}</span>
              </span>
              <RouterLink
                v-if="!check.clear"
                :to="check.to"
                class="shrink-0 font-mono text-[0.72rem] text-accent-deep hover:underline"
                >{{ t('platform.common.open') }}</RouterLink
              >
            </li>
          </ul>

          <p class="text-[0.74rem] text-muted">{{ attentionSummary }}</p>
        </div>
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.signups')"
        hint="new accounts"
      >
        <div class="flex min-h-0 flex-1 flex-col justify-center gap-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                {{ t('platform.last7') }}
              </p>
              <p class="mt-1.5 font-disp text-[2.2rem] font-semibold leading-none tracking-tight">
                {{ overview.signups.last7 }}
              </p>
            </div>

            <div class="border-s border-line/10 ps-4">
              <p class="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                {{ t('platform.last30') }}
              </p>
              <p class="mt-1.5 font-disp text-[2.2rem] font-semibold leading-none tracking-tight">
                {{ overview.signups.last30 }}
              </p>
            </div>
          </div>

          <p class="text-[0.78rem] leading-snug text-muted">{{ growthLine }}</p>
        </div>
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CheckCircle2, TriangleAlert } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import SkeletonGrid from '@/components/ui/SkeletonGrid.vue'
import StatTile from '@/components/charts/StatTile.vue'
import SparkLine from '@/components/charts/SparkLine.vue'
import BarRows from '@/components/charts/BarRows.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import HeatCalendar from '@/components/charts/HeatCalendar.vue'
import { foldOther } from '@/utils/breakdown'
import { portfolioUrl } from '@/config/env'
import { fetchPlatformOverview } from '@/services/admin.api'
import type { PlatformOverview } from '@/types/analytics'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const PERIODS = [7, 30, 90]
const ROW_BUDGET = { referrers: 6, busiest: 5 } as const
const LCP_BUDGET_MS = 2500
const ATTENTION_ROWS = 2

const overview = ref<PlatformOverview | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const period = ref(30)

const trendPoints = computed(() =>
  (overview.value?.traffic.trend ?? []).map((point) => ({
    date: point.date,
    value: point.sessions,
  })),
)

function share(count: number): number {
  const total = overview.value?.owners.total ?? 0
  return total === 0 ? 0 : Math.round((count / total) * 100)
}

const publishedShare = computed(() => share(overview.value?.owners.published ?? 0))

const states = computed(() => {
  const owners = overview.value?.owners
  if (!owners) return []

  return [
    { key: 'published', count: owners.published },
    { key: 'draft', count: owners.draft },
    { key: 'suspended', count: owners.suspended },
  ].filter((state) => state.count > 0)
})

const referrers = computed(() =>
  foldOther(overview.value?.traffic.referrers ?? [], ROW_BUDGET.referrers),
)

const busiest = computed(() =>
  (overview.value?.portfolios ?? [])
    .slice(0, ROW_BUDGET.busiest)
    .map((row, index) => ({ ...row, rank: index + 1 })),
)

const growthLine = computed(() => {
  const signups = overview.value?.signups
  if (!signups) return ''
  if (signups.last30 === 0) return 'Nobody has signed up in the last month.'

  const weekly = Math.round((signups.last7 / signups.last30) * 100)
  return `${weekly}% of this month's sign-ups arrived in the last seven days.`
})

const busiestRows = computed(() => ({
  gridTemplateRows: `repeat(${Math.max(ROW_BUDGET.busiest, busiest.value.length)}, minmax(0, 1fr))`,
}))

const attention = computed(() => {
  const data = overview.value
  if (!data) return []

  const published = data.owners.published
  const lcp = data.traffic.vitals.lcp
  const errors = data.traffic.errors.length
  const activation = data.owners.total === 0 ? 0 : Math.round((published / data.owners.total) * 100)
  const idle = data.portfolios.filter((row) => row.status === 'published' && row.sessions === 0)

  return [
    {
      key: 'suspended',
      label: 'Suspended portfolios',
      clear: data.owners.suspended === 0,
      detail:
        data.owners.suspended === 0
          ? 'No portfolio is held offline by an operator.'
          : `${data.owners.suspended} held offline. Each one is invisible to visitors until restored.`,
      to: '/platform/portfolios',
    },
    {
      key: 'errors',
      label: 'JavaScript errors',
      clear: errors === 0,
      detail:
        errors === 0
          ? 'No portfolio reported a script error in this window.'
          : `${errors} distinct message${errors === 1 ? '' : 's'} reported. Health names the accounts each one hit.`,
      to: '/platform/health',
    },
    {
      key: 'speed',
      label: 'Load speed',
      clear: lcp === null || lcp <= LCP_BUDGET_MS,
      detail:
        lcp === null
          ? 'Not measured yet — needs a few more visits.'
          : lcp <= LCP_BUDGET_MS
            ? `Main content arrives in ${(lcp / 1000).toFixed(1)}s, inside the 2.5s budget.`
            : `Main content takes ${(lcp / 1000).toFixed(1)}s, over the 2.5s budget. Usually uploaded photos.`,
      to: '/platform/health',
    },
    {
      key: 'activation',
      label: 'Activation',
      clear: data.owners.draft === 0,
      detail:
        data.owners.draft === 0
          ? `Every account has published. Activation is ${activation}%.`
          : `${data.owners.draft} account${data.owners.draft === 1 ? ' has' : 's have'} never published. Activation is ${activation}%.`,
      to: '/platform/portfolios',
    },
    {
      key: 'idle',
      label: 'Published but unvisited',
      clear: idle.length === 0,
      detail:
        idle.length === 0
          ? 'Every published portfolio has been visited at least once.'
          : `${idle.length} published portfolio${idle.length === 1 ? '' : 's'} never received a session. Worth checking the address resolves.`,
      to: '/platform/portfolios',
    },
  ]
})

const needsWork = computed(() => attention.value.filter((check) => !check.clear).length)

const topAttention = computed(() =>
  attention.value.filter((check) => !check.clear).slice(0, ATTENTION_ROWS),
)

const attentionSummary = computed(() => {
  const hidden = needsWork.value - topAttention.value.length
  if (hidden <= 0)
    return `${attention.value.length - needsWork.value} other check${attention.value.length - needsWork.value === 1 ? '' : 's'} clear.`
  return `${hidden} more check${hidden === 1 ? '' : 's'} also need you — open Health or Portfolios.`
})

async function load(days: number): Promise<void> {
  period.value = days
  loading.value = true
  error.value = null

  try {
    overview.value = await fetchPlatformOverview(days)
  } catch (cause) {
    overview.value = null
    error.value = cause instanceof Error ? cause.message : 'The platform overview is unavailable'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load(period.value))
</script>
