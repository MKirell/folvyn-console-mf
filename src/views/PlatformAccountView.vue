<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <PlatformHeader
      :title="detail ? `/${detail.account.slug}` : 'Account'"
      :description="t('platform.account.blurb')"
    >
      <template #actions>
        <RouterLink
          to="/platform/portfolios"
          class="shrink-0 font-mono text-[0.74rem] text-muted hover:text-ink"
          >← All accounts</RouterLink
        >
      </template>
    </PlatformHeader>

    <SkeletonGrid v-if="loading" :panels="[8, 4, 12]" :label="t('platform.account.blurb')" />

    <EmptyState v-else-if="error" icon="Shield" :title="t('errors.account')" :description="error">
      <AppButton variant="primary" @click="load">{{ t('common.retry') }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="!detail"
      icon="Users"
      :title="t('platform.account.notFound')"
      description="No account carries that identifier."
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.account.status')"
        :value="detail.account.status"
        :hint="detail.plan"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.account.documents')"
        :value="String(detail.totals.documents)"
        :hint="`${detail.totals.locales} locales`"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.common.sessions')"
        :value="detail.totals.sessions.toLocaleString()"
        hint="last 90 days"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.account.measurement')"
        :value="detail.consentMode"
        :hint="detail.consentMode === 'enhanced' ? 'banner shown' : 'no banner needed'"
      />

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.common.traffic')"
        hint="sessions a day, 90 days"
      >
        <SparkLine :points="trend" unit="sessions" :label="t('platform.common.sessions')" />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.account.written')"
        hint="counts only"
      >
        <BarRows
          :rows="documents"
          :slots="ROW_BUDGET.documents"
          :empty="t('platform.account.nothingWritten')"
        />
      </PanelCard>

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.account.lifecycle')"
        hint="every operator action on this account"
      >
        <ol v-if="detail.timeline.length" class="flex min-h-0 flex-1 flex-col gap-1.5" role="list">
          <li
            v-for="(entry, index) in detail.timeline"
            :key="`${entry.at}-${index}`"
            class="flex flex-wrap items-center gap-3 rounded-[9px] border border-line/8 bg-bg px-3 py-2"
          >
            <span
              class="shrink-0 rounded-[5px] bg-accent/12 px-1.5 py-[1px] font-mono text-[0.62rem] uppercase text-accent-deep"
              >{{ entry.action }}</span
            >
            <span class="min-w-0 flex-1 truncate text-[0.78rem] text-ink-soft">{{
              entry.reason ?? '—'
            }}</span>
            <span class="shrink-0 font-mono text-[0.7rem] text-muted">{{
              entry.actor ?? 'unknown'
            }}</span>
            <span class="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted">{{
              entry.at.slice(0, 10)
            }}</span>
          </li>
        </ol>
        <div v-else class="grid flex-1 place-items-center py-6 text-center">
          <div>
            <p class="text-[0.86rem] text-ink">{{ t('platform.account.noOperator') }}</p>
            <p class="mt-1 max-w-[52ch] text-[0.78rem] text-muted">
              {{ t('platform.accountAudited') }}
            </p>
          </div>
        </div>
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import SkeletonGrid from '@/components/ui/SkeletonGrid.vue'
import PlatformHeader from '@/components/layout/PlatformHeader.vue'
import BarRows from '@/components/charts/BarRows.vue'
import SparkLine from '@/components/charts/SparkLine.vue'
import StatTile from '@/components/charts/StatTile.vue'
import { foldOther } from '@/utils/breakdown'
import { fetchAccountDetail } from '@/services/admin.api'
import type { AccountDetail } from '@/types/analytics'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const ROW_BUDGET = { documents: 6 } as const

const route = useRoute()
const detail = ref<AccountDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const trend = computed(() =>
  (detail.value?.traffic ?? []).map((point) => ({ date: point.date, value: point.sessions })),
)

const documents = computed(() => foldOther(detail.value?.documents ?? [], ROW_BUDGET.documents))

async function load(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    detail.value = await fetchAccountDetail(String(route.params.id))
  } catch (e) {
    detail.value = null
    error.value = e instanceof Error ? e.message : 'The account is not available'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>
