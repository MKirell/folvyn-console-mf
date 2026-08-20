<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">
          {{ t('views.insights.title') }}
        </h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          {{ t('views.insights.blurb') }}
        </p>
      </div>

      <div
        class="flex items-center gap-0.5 rounded-[9px] border border-line/8 bg-surface p-[3px]"
        role="group"
        aria-:label="t('views.insights.period')"
      >
        <button
          v-for="days in PERIODS"
          :key="days"
          type="button"
          class="rounded-[6px] px-2.5 py-[4px] font-mono text-[0.7rem] transition-colors motion-reduce:transition-none"
          :class="
            days === analytics.period
              ? 'bg-accent/14 text-accent-deep'
              : 'text-muted hover:text-ink'
          "
          :aria-pressed="days === analytics.period"
          @click="analytics.load(days)"
        >
          {{ days }}d
        </button>
      </div>
    </header>

    <SkeletonGrid
      v-if="analytics.loading"
      :panels="[8, 4, 12, 6, 6, 12, 3, 6, 3, 8, 4, 6, 6, 8, 4]"
      :label="t('views.insights.title')"
    />

    <EmptyState
      v-else-if="analytics.error"
      icon="Shield"
      :title="t('errors.insights')"
      :description="analytics.error"
    >
      <AppButton variant="primary" @click="analytics.load(analytics.period)">{{
        t('common.retry')
      }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="!summary"
      icon="Gauge"
      :title="t('views.insights.noneTitle')"
      :description="t('views.insights.noneDesc')"
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('views.insights.visitors')"
        :value="summary.totals.visitors.toLocaleString()"
        :delta="summary.deltas.visitors"
        :hint="t('views.insights.vsPrevious', { days: summary.days })"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('views.insights.sessions')"
        :value="summary.totals.sessions.toLocaleString()"
        :delta="summary.deltas.sessions"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('views.insights.dwell')"
        :value="dwell"
        :delta="summary.deltas.dwellMs"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('views.insights.documentsOpened')"
        :value="summary.totals.docs.toLocaleString()"
        :delta="summary.deltas.docs"
      />

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.visitorsPanel')"
        :hint="t('views.insights.days', { days: summary.days })"
      >
        <SparkLine :points="trend" unit="visitors" :label="t('views.insights.visitors')" />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.referrers')"
      >
        <BarRows
          :rows="referrers"
          :slots="ROW_BUDGET.referrers"
          show-share
          :empty="t('views.insights.emptyReferrers')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.funnel')"
        :hint="t('views.insights.hintSections')"
      >
        <FunnelColumns :rows="summary.sections" :sessions="summary.totals.sessions" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.cards')"
        :hint="cardsHint"
      >
        <CardRows
          :rows="projectCards"
          :slots="ROW_BUDGET.cards"
          :empty="t('views.insights.emptyCards')"
        />
        <p v-if="bestProject" class="mt-3 text-[0.78rem] text-muted">
          <strong class="font-medium text-ink">{{ bestProject.label }}</strong>
          {{ t('views.insights.bestProject', { rate: bestProject.rate }) }}
        </p>
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.scroll')"
        :hint="t('views.insights.hintScroll')"
      >
        <DepthGauge :quartiles="summary.scrollQuartiles" :sessions="summary.totals.sessions" />
      </PanelCard>

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.when')"
        :hint="t('views.insights.perDay', { days: summary.days })"
      >
        <HeatCalendar :points="daily" />
      </PanelCard>

      <PanelCard
        class="col-span-3 max-1000:col-span-3 max-600:col-span-2"
        :title="t('views.insights.devices')"
      >
        <DonutChart
          :rows="summary.devices"
          :label="t('views.insights.devices')"
          :empty="t('views.insights.emptyDevices')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.countries')"
        :hint="t('views.insights.hintCountries')"
      >
        <BarRows
          :rows="countries"
          :slots="ROW_BUDGET.countries"
          show-share
          :empty="t('views.insights.emptyCountries')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-3 max-1000:col-span-3 max-600:col-span-2"
        :title="t('views.insights.browsers')"
      >
        <DonutChart
          :rows="summary.browsers"
          :label="t('views.insights.browsers')"
          :empty="t('views.insights.emptyBrowsers')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.documents')"
        :hint="t('views.insights.hintDocuments')"
      >
        <BarRows
          :rows="documents"
          :slots="ROW_BUDGET.documents"
          :empty="t('views.insights.emptyDocuments')"
        />
        <p
          v-if="unopened.length"
          class="mt-3 truncate text-[0.78rem] text-muted"
          :title="unopened.join(', ')"
        >
          {{ t('views.insights.neverOpened') }}
          <span class="text-ink">{{ unopened.slice(0, 3).join(', ') }}</span
          ><span v-if="unopened.length > 3">{{
            t('views.insights.andMore', { count: unopened.length - 3 })
          }}</span>
        </p>
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.contact')"
        :hint="t('views.insights.hintContact', { rate: summary.contactRate })"
      >
        <RankList
          :rows="contact"
          :slots="ROW_BUDGET.contact"
          :empty="t('views.insights.emptyContact')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.terminal')"
        :hint="t('views.insights.hintShell', { rate: shellRate })"
      >
        <RankList
          :rows="shell"
          :slots="ROW_BUDGET.shell"
          :empty="t('views.insights.emptyTerminal')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.outbound')"
        :hint="t('views.insights.hintOutbound')"
      >
        <BarRows
          :rows="outbound"
          :slots="ROW_BUDGET.outbound"
          show-share
          :empty="t('views.insights.emptyOutbound')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.loadSpeed')"
        :hint="t('views.insights.hintVitals')"
      >
        <div class="flex flex-1 flex-col justify-center">
          <div class="flex items-center gap-3">
            <span
              class="flex shrink-0 items-center gap-1.5 rounded-[7px] px-2 py-[3px] font-mono text-[0.66rem] uppercase tracking-[0.1em]"
              :class="loadSpeed.tone"
            >
              <component :is="loadSpeed.icon" :size="12" :stroke-width="2.2" aria-hidden="true" />
              {{ loadSpeed.verdict }}
            </span>
            <span class="min-w-0 flex-1 font-mono text-[0.8rem] tabular-nums">{{
              loadSpeed.display
            }}</span>
          </div>
          <p class="mt-2.5 truncate text-[0.78rem] text-muted" :title="loadSpeed.advice">
            {{ loadSpeed.advice }}
          </p>
          <RouterLink
            v-if="loadSpeed.actionable"
            to="/media"
            class="mt-2 inline-block text-[0.78rem] text-accent-deep underline"
            >{{ t('views.insights.reviewImages') }}</RouterLink
          >
        </div>
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('views.insights.languages')"
      >
        <StackedBar :rows="langs" :empty="t('views.insights.emptyLanguages')" />
        <RouterLink
          v-if="summary.langs.length"
          to="/locales"
          class="mt-3 inline-flex items-center gap-1 text-[0.74rem] text-accent-deep hover:underline"
        >
          {{ t('views.insights.weigh') }}
          <ChevronRight :size="12" :stroke-width="2" aria-hidden="true" />
        </RouterLink>
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight, CircleCheck, TriangleAlert } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import SkeletonGrid from '@/components/ui/SkeletonGrid.vue'
import BarRows from '@/components/charts/BarRows.vue'
import CardRows, { type CardRow } from '@/components/charts/CardRows.vue'
import DepthGauge from '@/components/charts/DepthGauge.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import FunnelColumns from '@/components/charts/FunnelColumns.vue'
import HeatCalendar from '@/components/charts/HeatCalendar.vue'
import RankList from '@/components/charts/RankList.vue'
import StackedBar from '@/components/charts/StackedBar.vue'
import SparkLine from '@/components/charts/SparkLine.vue'
import StatTile from '@/components/charts/StatTile.vue'
import { foldOther } from '@/utils/breakdown'
import type { AnalyticsBreakdown } from '@/types/analytics'
import { PERIODS, useAnalyticsStore } from '@/stores/analytics'
import { COLLECTIONS } from '@/registry/collections'
import { titleOf } from '@/utils/entity'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const LCP_GOOD = 2500

const analytics = useAnalyticsStore()
const content = useContentStore()

const summary = computed(() => analytics.summary)

const ROW_BUDGET = {
  referrers: 6,
  countries: 5,
  documents: 4,
  contact: 4,
  outbound: 4,
  shell: 4,
  langs: 4,
  cards: 3,
} as const

function capped(rows: AnalyticsBreakdown[] | undefined, limit: number): AnalyticsBreakdown[] {
  return foldOther(rows ?? [], limit)
}

const referrers = computed(() => capped(summary.value?.referrers, ROW_BUDGET.referrers))
const countries = computed(() => capped(summary.value?.countries, ROW_BUDGET.countries))
const documents = computed(() => capped(summary.value?.docsOpened, ROW_BUDGET.documents))
const contact = computed(() => capped(summary.value?.contact, ROW_BUDGET.contact))
const outbound = computed(() => capped(summary.value?.outbound, ROW_BUDGET.outbound))
const shell = computed(() => capped(summary.value?.shell, ROW_BUDGET.shell))
const langs = computed(() => capped(summary.value?.langs, ROW_BUDGET.langs))

const ui = useUiStore()

const activeLang = computed(() => ui.editingLang || content.referenceLang)

const projectTitles = computed(
  () =>
    new Map(
      content
        .list('project')
        .map((project) => [project.id, titleOf(COLLECTIONS.project, project, activeLang.value)]),
    ),
)

const projectCards = computed<CardRow[]>(() =>
  (summary.value?.cards ?? [])
    .filter((card) => projectTitles.value.has(card.key))
    .slice(0, ROW_BUDGET.cards)
    .map((card) => ({ ...card, label: projectTitles.value.get(card.key) || card.key })),
)

const bestProject = computed(() => {
  const [top] = projectCards.value
  return top && top.clicks > 0 ? top : null
})

const cardsHint = computed(() =>
  projectCards.value.length === 0
    ? t('views.insights.cardsHintEmpty')
    : t('views.insights.cardsHint'),
)

const unopened = computed(() => {
  const opened = new Set((summary.value?.docsOpened ?? []).map((row) => row.key))

  return content
    .list('certification')
    .filter((certification) => certification.doc && !opened.has(String(certification.doc)))
    .map((certification) => String(certification.title ?? certification.doc))
})

const trend = computed(
  () =>
    summary.value?.trend.map((point) => ({ date: point.date.slice(5), value: point.visitors })) ??
    [],
)

const daily = computed(
  () => summary.value?.trend.map((point) => ({ date: point.date, value: point.sessions })) ?? [],
)

const dwell = computed(() => {
  const ms = summary.value?.totals.dwellMsAverage ?? 0
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
})

const shellRate = computed(() => {
  const visitors = summary.value?.totals.visitors ?? 0
  const found = summary.value?.shellSessions ?? 0
  return visitors === 0 ? 0 : Math.round((found / visitors) * 1000) / 10
})

const loadSpeed = computed(() => {
  const lcp = summary.value?.vitals.lcp ?? null

  if (lcp === null) {
    return {
      display: t('views.insights.notMeasured'),
      verdict: t('views.insights.verdictPending'),
      icon: CircleCheck,
      tone: 'bg-bg-tint text-muted',
      advice: t('views.insights.advicePending'),
      actionable: false,
    }
  }

  const seconds = `${(lcp / 1000).toFixed(1)}s`

  if (lcp <= LCP_GOOD) {
    return {
      display: t('views.insights.toMainContent', { seconds }),
      verdict: t('views.insights.verdictGood'),
      icon: CircleCheck,
      tone: 'bg-sage/14 text-sage',
      advice: t('views.insights.adviceGood'),
      actionable: false,
    }
  }

  return {
    display: t('views.insights.toMainContent', { seconds }),
    verdict: t('views.insights.verdictNeedsWork'),
    icon: TriangleAlert,
    tone: 'bg-gold/14 text-gold',
    advice: t('views.insights.adviceSlow'),
    actionable: true,
  }
})

onMounted(() => {
  void analytics.load()
  void content.loadAll()
})
</script>
