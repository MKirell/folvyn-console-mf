<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">
          {{ t('platform.overview.title') }}
        </h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">{{ t('platform.overview.blurb') }}</p>
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
      :panels="[6, 6, 4, 4, 4, 12, 6, 6]"
      :label="t('platform.overview.title')"
    />

    <EmptyState v-else-if="error" icon="Shield" :title="t('errors.overview')" :description="error">
      <AppButton variant="primary" @click="load(period)">{{ t('common.retry') }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="!overview"
      icon="Gauge"
      :title="t('platform.overview.nothing')"
      :description="t('platform.overview.noAccountDesc')"
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.overview.accounts')"
        :value="String(overview.owners.total)"
        :hint="t('platform.overview.liveHint', { pct: publishedShare })"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.overview.live')"
        :value="String(overview.owners.published)"
        :hint="t('platform.overview.publishedHint')"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.overview.draft')"
        :value="String(overview.owners.draft)"
        :hint="t('platform.overview.draftHint')"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.overview.suspended')"
        :value="String(overview.owners.suspended)"
        :hint="t('platform.overview.suspendedHint')"
      />

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.activation')"
        :hint="activationHint"
      >
        <FunnelShape
          :rows="activation"
          :sessions="overview.owners.total"
          :label="t('platform.overview.activation')"
          :empty="t('platform.overview.noAccountDesc')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.signups')"
        :hint="t('platform.overview.signupsHint')"
      >
        <SplitStat
          :rows="signupSplit"
          :unit="t('platform.overview.signupsUnit')"
          :verdicts="signupVerdicts"
          :empty="t('platform.overview.noSignups')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-3 max-600:col-span-2"
        :title="t('platform.overview.states')"
        :hint="t('platform.overview.statesHint')"
      >
        <DonutChart
          :rows="states"
          :label="t('platform.overview.states')"
          :empty="t('platform.overview.noAccount')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-3 max-600:col-span-2"
        :title="t('platform.overview.whereFrom')"
        :hint="t('platform.overview.whereFromHint')"
      >
        <BarRows
          :rows="referrers"
          :slots="ROW_BUDGET.referrers"
          show-share
          :empty="t('platform.common.noReferrer')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.common.funnel')"
        :hint="t('platform.overview.funnelHint')"
      >
        <FunnelColumns
          :rows="sections"
          :sessions="overview.traffic.totals.sessions"
          :empty="t('ui.notEnoughData')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.busy')"
        :hint="t('platform.overview.busyHint', { days: period })"
      >
        <HeatCalendar :points="trendPoints" :empty="t('ui.noTraffic')" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.busiest')"
        :hint="t('platform.overview.busiestHint', { count: overview.portfolios.length })"
      >
        <ul
          v-if="busiest.length"
          class="grid min-h-0 flex-1 grid-cols-1 gap-1.5"
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
              >{{ statusLabel(row.status) }}</span
            >
            <span
              class="w-16 shrink-0 text-end font-mono text-[0.74rem] tabular-nums"
              :title="t('platform.portfolios.sessionsWindow')"
              >{{ row.visitors.toLocaleString() }} v</span
            >
          </li>
        </ul>
        <p v-else class="grid flex-1 place-items-center text-[0.8rem] text-muted">
          {{ t('platform.overview.noVisit') }}
        </p>
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.overview.attention')"
        :hint="attentionHint"
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
import BarRows from '@/components/charts/BarRows.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import FunnelColumns from '@/components/charts/FunnelColumns.vue'
import FunnelShape from '@/components/charts/FunnelShape.vue'
import HeatCalendar from '@/components/charts/HeatCalendar.vue'
import SplitStat from '@/components/charts/SplitStat.vue'
import StatTile from '@/components/charts/StatTile.vue'
import { foldOther } from '@/utils/breakdown'
import { portfolioUrl } from '@/config/env'
import { statusLabel } from '@/i18n/labels'
import { fetchPlatformOverview } from '@/services/admin.api'
import type { PlatformOverview } from '@/types/analytics'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const PERIODS = [7, 30, 90]
const ROW_BUDGET = { busiest: 5, referrers: 5 } as const
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
const visited = computed(() => overview.value?.portfolios.length ?? 0)

const activation = computed(() => {
  const owners = overview.value?.owners
  if (!owners || owners.total === 0) return []

  return [
    { key: t('platform.overview.stepSignedUp'), count: owners.total },
    { key: t('platform.overview.stepPublished'), count: owners.published },
    { key: t('platform.overview.stepVisited'), count: visited.value },
  ]
})

const activationHint = computed(() => {
  const owners = overview.value?.owners
  if (!owners || owners.total === 0) return t('platform.overview.activationHintNone')
  return t('platform.overview.activationHint', { pct: share(visited.value) })
})

const states = computed(() => {
  const owners = overview.value?.owners
  if (!owners) return []

  return [
    { key: t('platform.overview.live'), count: owners.published },
    { key: t('platform.overview.draft'), count: owners.draft },
    { key: t('platform.overview.suspended'), count: owners.suspended },
  ].filter((row) => row.count > 0)
})

const referrers = computed(() =>
  foldOther(overview.value?.traffic.referrers ?? [], ROW_BUDGET.referrers),
)

const sections = computed(() => overview.value?.traffic.sections ?? [])

const signupSplit = computed(() => {
  const signups = overview.value?.signups
  if (!signups || signups.last30 === 0) return []

  return [
    { key: t('platform.overview.signupsRecent'), count: signups.last7 },
    { key: t('platform.overview.signupsEarlier'), count: signups.last30 - signups.last7 },
  ]
})

const signupVerdicts = computed(() => ({
  strong: t('platform.overview.signupsBusy'),
  even: t('platform.overview.signupsSteady'),
  weak: t('platform.overview.signupsQuiet'),
}))

const busiest = computed(() =>
  (overview.value?.portfolios ?? [])
    .slice(0, ROW_BUDGET.busiest)
    .map((row, index) => ({ ...row, rank: index + 1 })),
)

const busiestRows = computed(() => ({
  gridTemplateRows: `repeat(${Math.max(ROW_BUDGET.busiest, busiest.value.length)}, minmax(0, 1fr))`,
}))

const attention = computed(() => {
  const data = overview.value
  if (!data) return []

  const lcp = data.traffic.vitals.lcp
  const errors = data.traffic.errors.length
  const idle = data.portfolios.filter((row) => row.status === 'published' && row.sessions === 0)

  return [
    {
      key: 'suspended',
      label: t('platform.overview.checks.suspended.label'),
      clear: data.owners.suspended === 0,
      detail:
        data.owners.suspended === 0
          ? t('platform.overview.checks.suspended.clear')
          : t('platform.overview.checks.suspended.raised', { count: data.owners.suspended }),
      to: '/platform/portfolios',
    },
    {
      key: 'errors',
      label: t('platform.overview.checks.errors.label'),
      clear: errors === 0,
      detail:
        errors === 0
          ? t('platform.overview.checks.errors.clear')
          : t('platform.overview.checks.errors.raised', { count: errors }),
      to: '/platform/health',
    },
    {
      key: 'speed',
      label: t('platform.overview.checks.speed.label'),
      clear: lcp === null || lcp <= LCP_BUDGET_MS,
      detail:
        lcp === null
          ? t('platform.overview.checks.speed.pending')
          : t(
              lcp <= LCP_BUDGET_MS
                ? 'platform.overview.checks.speed.clear'
                : 'platform.overview.checks.speed.raised',
              { seconds: (lcp / 1000).toFixed(1), budget: LCP_BUDGET_MS / 1000 },
            ),
      to: '/platform/health',
    },
    {
      key: 'activation',
      label: t('platform.overview.checks.activation.label'),
      clear: data.owners.draft === 0,
      detail:
        data.owners.draft === 0
          ? t('platform.overview.checks.activation.clear', { pct: publishedShare.value })
          : t('platform.overview.checks.activation.raised', {
              count: data.owners.draft,
              pct: publishedShare.value,
            }),
      to: '/platform/portfolios',
    },
    {
      key: 'idle',
      label: t('platform.overview.checks.idle.label'),
      clear: idle.length === 0,
      detail:
        idle.length === 0
          ? t('platform.overview.checks.idle.clear')
          : t('platform.overview.checks.idle.raised', { count: idle.length }),
      to: '/platform/portfolios',
    },
  ]
})

const needsWork = computed(() => attention.value.filter((check) => !check.clear).length)

const topAttention = computed(() =>
  [...attention.value].sort((a, b) => Number(a.clear) - Number(b.clear)).slice(0, ATTENTION_ROWS),
)

const attentionHint = computed(() =>
  needsWork.value === 0
    ? t('platform.overview.attentionClear')
    : t('platform.overview.attentionHint', {
        needs: needsWork.value,
        total: attention.value.length,
      }),
)

const attentionSummary = computed(() => {
  const hidden = needsWork.value - topAttention.value.filter((check) => !check.clear).length
  if (hidden > 0) return t('platform.overview.attentionMore', { count: hidden })
  if (needsWork.value === 0)
    return t('platform.overview.attentionAllPassed', { days: period.value })
  return t('platform.overview.attentionOthersClear', {
    count: attention.value.length - needsWork.value,
  })
})

async function load(days: number): Promise<void> {
  period.value = days
  loading.value = true
  error.value = null

  try {
    overview.value = await fetchPlatformOverview(days)
  } catch (cause) {
    overview.value = null
    error.value = cause instanceof Error ? cause.message : t('errors.overview')
  } finally {
    loading.value = false
  }
}

onMounted(() => void load(period.value))
</script>
