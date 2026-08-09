<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">Insights</h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          No cookies, no stored identifier, no cross-day tracking — counts are indicative.
        </p>
      </div>

      <div
        class="flex items-center gap-0.5 rounded-[9px] border border-line/8 bg-surface p-[3px]"
        role="group"
        aria-label="Reporting period"
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

    <div v-if="analytics.loading" class="grid place-items-center py-20" role="status">
      <span
        class="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40"
      ></span>
    </div>

    <EmptyState
      v-else-if="!summary"
      icon="Gauge"
      title="No analytics yet"
      :description="
        analytics.error ??
        'The collector ships in Phase 4. Until then this screen has nothing to read.'
      "
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Visitors"
        :value="summary.totals.visitors.toLocaleString()"
        :delta="summary.deltas.visitors"
        :hint="`vs previous ${summary.days} days`"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Sessions"
        :value="summary.totals.sessions.toLocaleString()"
        :delta="summary.deltas.sessions"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Avg dwell"
        :value="dwell"
        :delta="summary.deltas.dwellMs"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Documents opened"
        :value="summary.totals.docs.toLocaleString()"
        :delta="summary.deltas.docs"
      />

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        title="Visitors"
        :hint="`${summary.days} days`"
      >
        <SparkLine :points="trend" unit="visitors" label="Visitors" />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        title="Where they came from"
      >
        <BarRows
          :rows="referrers"
          :slots="ROW_BUDGET.referrers"
          show-share
          empty="No referrers recorded yet"
        />
      </PanelCard>

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        title="How far they get"
        hint="share of sessions reaching each section"
      >
        <FunnelColumns :rows="summary.sections" :sessions="summary.totals.sessions" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        title="Which project earns attention"
        :hint="cardsHint"
      >
        <CardRows
          :rows="projectCards"
          :slots="ROW_BUDGET.cards"
          empty="No project has been on screen long enough to count yet"
        />
        <p v-if="bestProject" class="mt-3 text-[0.78rem] text-muted">
          <strong class="font-medium text-ink">{{ bestProject.label }}</strong> is opened by
          {{ bestProject.rate }}% of the people who see it. Put it first.
        </p>
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        title="How far down they read"
        hint="share of sessions reaching each depth"
      >
        <DepthGauge :quartiles="summary.scrollQuartiles" :sessions="summary.totals.sessions" />
      </PanelCard>

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        title="When they came"
        :hint="`sessions a day, ${summary.days} days`"
      >
        <HeatCalendar :points="daily" />
      </PanelCard>

      <PanelCard
        class="col-span-3 max-1000:col-span-3 max-600:col-span-2"
        title="What they read on"
      >
        <DonutChart :rows="summary.devices" label="Devices" empty="No device data yet" />
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
        <DonutChart :rows="summary.browsers" label="Browsers" empty="No browser data yet" />
      </PanelCard>

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        title="Which document is worth showing"
        hint="opens over the period"
      >
        <BarRows
          :rows="documents"
          :slots="ROW_BUDGET.documents"
          empty="No document has been opened yet"
        />
        <p v-if="unopened.length" class="mt-3 text-[0.78rem] text-muted">
          Never opened: <span class="text-ink">{{ unopened.slice(0, 3).join(', ') }}</span
          ><span v-if="unopened.length > 3"> and {{ unopened.length - 3 }} more</span>
        </p>
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        title="Are they reaching out"
        :hint="`${summary.contactRate}% of sessions`"
      >
        <RankList :rows="contact" :slots="ROW_BUDGET.contact" empty="Nobody has made contact yet" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        title="Terminal"
        :hint="`${shellRate}% of visitors`"
      >
        <RankList
          :rows="shell"
          :slots="ROW_BUDGET.shell"
          empty="Nobody has found the terminal yet"
        />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        title="Where they went next"
        hint="outbound links"
      >
        <BarRows
          :rows="outbound"
          :slots="ROW_BUDGET.outbound"
          show-share
          empty="No outbound clicks yet"
        />
      </PanelCard>

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        title="How fast it loads"
        hint="what visitors wait for"
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
          <p class="mt-2.5 text-[0.78rem] text-muted">{{ loadSpeed.advice }}</p>
          <RouterLink
            v-if="loadSpeed.actionable"
            to="/media"
            class="mt-2 inline-block text-[0.78rem] text-accent-deep underline"
            >Review your images</RouterLink
          >
        </div>
      </PanelCard>

      <PanelCard class="col-span-4 max-1000:col-span-6 max-600:col-span-2" title="Languages">
        <StackedBar :rows="langs" empty="No language data yet" />
        <RouterLink
          v-if="summary.langs.length"
          to="/locales"
          class="mt-3 inline-flex items-center gap-1 text-[0.74rem] text-accent-deep hover:underline"
        >
          Weigh this against the backlog
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
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
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
import { useContentStore } from '@/stores/content'

const LCP_GOOD = 2500

const analytics = useAnalyticsStore()
const content = useContentStore()

const summary = computed(() => analytics.summary)

const ROW_BUDGET = {
  referrers: 6,
  countries: 6,
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

const projectTitles = computed(
  () =>
    new Map(content.list('project').map((project) => [project.id, String(project.title ?? '')])),
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
  projectCards.value.length === 0 ? 'needs a few visits' : 'opened, out of the times it was seen',
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
      display: 'not measured yet',
      verdict: 'pending',
      icon: CircleCheck,
      tone: 'bg-bg-tint text-muted',
      advice: 'Needs a few visits before there is anything to read.',
      actionable: false,
    }
  }

  const seconds = `${(lcp / 1000).toFixed(1)}s`

  if (lcp <= LCP_GOOD) {
    return {
      display: `${seconds} to the main content`,
      verdict: 'good',
      icon: CircleCheck,
      tone: 'bg-sage/14 text-sage',
      advice: 'Visitors see your hero almost immediately. Nothing to do.',
      actionable: false,
    }
  }

  return {
    display: `${seconds} to the main content`,
    verdict: 'needs work',
    icon: TriangleAlert,
    tone: 'bg-gold/14 text-gold',
    advice:
      'Over 2.5 seconds. On a portfolio this is nearly always a heavy photo — the images you upload are the part you control.',
    actionable: true,
  }
})

onMounted(() => {
  void analytics.load()
  void content.loadAll()
})
</script>
