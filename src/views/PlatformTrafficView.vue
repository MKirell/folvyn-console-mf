<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <PlatformHeader
      :title="t('platform.common.traffic')"
      :description="t('platform.trafficScreen.blurb')"
      :periods="PERIODS"
      :period="period"
      @select="load"
    />

    <SkeletonGrid
      v-if="loading"
      :panels="[8, 4, 12, 3, 6, 3, 6, 6]"
      :label="t('platform.common.traffic')"
    />

    <EmptyState v-else-if="error" icon="Shield" :title="t('errors.traffic')" :description="error">
      <AppButton variant="primary" @click="load(period)">{{ t('common.retry') }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="!traffic"
      icon="Activity"
      :title="t('platform.trafficScreen.none')"
      description="No portfolio has been visited in this window."
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.common.visitors')"
        :value="traffic.totals.visitors.toLocaleString()"
        :delta="traffic.deltas.visitors"
        :hint="`vs previous ${traffic.days} days`"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.common.sessions')"
        :value="traffic.totals.sessions.toLocaleString()"
        :delta="traffic.deltas.sessions"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.common.documentsOpened')"
        :value="traffic.totals.docs.toLocaleString()"
        :delta="traffic.deltas.docs"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.common.bounced')"
        :value="`${bounceRate}%`"
        hint="under ten seconds"
      />

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.common.sessions')"
        :hint="`${traffic.from} → ${traffic.to}`"
      >
        <SparkLine :points="trend" unit="sessions" :label="t('platform.common.sessions')" />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.common.referrers')"
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
        :title="t('platform.common.funnel')"
        hint="every portfolio, added together"
      >
        <FunnelColumns :rows="traffic.sections" :sessions="traffic.totals.sessions" />
      </PanelCard>

      <PanelCard
        class="col-span-3 max-1000:col-span-3 max-600:col-span-2"
        :title="t('platform.common.readOn')"
      >
        <DonutChart
          :rows="traffic.devices"
          :label="t('platform.common.devices')"
          :empty="t('platform.common.noDevice')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.common.whereThey')"
        hint="top countries"
      >
        <BarRows
          :rows="countries"
          :slots="ROW_BUDGET.countries"
          show-share
          :empty="t('platform.common.noCountry')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-3 max-1000:col-span-3 max-600:col-span-2"
        :title="t('platform.common.whichBrowser')"
      >
        <DonutChart
          :rows="traffic.browsers"
          :label="t('platform.common.browsers')"
          :empty="t('platform.common.noBrowser')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.common.whichLanguage')"
        hint="sessions per locale"
      >
        <StackedBar :rows="langs" :empty="t('platform.common.noLanguage')" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.trafficScreen.comeBack')"
        hint="needs the visitor's consent"
      >
        <SplitStat :rows="returningSplit" :empty="t('platform.trafficScreen.noReturn')" />
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import SkeletonGrid from '@/components/ui/SkeletonGrid.vue'
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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const PERIODS = [7, 30, 90]
const ROW_BUDGET = { referrers: 6, countries: 5, langs: 4 } as const

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
