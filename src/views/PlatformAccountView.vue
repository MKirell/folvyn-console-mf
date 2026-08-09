<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <PlatformHeader
      :title="detail ? `/${detail.account.slug}` : 'Account'"
      description="Metadata only. Draft content is never readable here — open the public page like anyone else."
    >
      <template #actions>
        <RouterLink
          to="/platform/portfolios"
          class="shrink-0 font-mono text-[0.74rem] text-muted hover:text-ink"
          >← All accounts</RouterLink
        >
      </template>
    </PlatformHeader>

    <div v-if="loading" class="grid place-items-center py-20" role="status">
      <span
        class="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40"
      ></span>
    </div>

    <EmptyState
      v-else-if="!detail"
      icon="Users"
      title="Account not found"
      :description="error ?? 'No account carries that identifier.'"
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Status"
        :value="detail.account.status"
        :hint="detail.plan"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Documents"
        :value="String(detail.totals.documents)"
        :hint="`${detail.totals.locales} locales`"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Sessions"
        :value="detail.totals.sessions.toLocaleString()"
        hint="last 90 days"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Measurement"
        :value="detail.consentMode"
        :hint="detail.consentMode === 'enhanced' ? 'banner shown' : 'no banner needed'"
      />

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        title="Traffic"
        hint="sessions a day, 90 days"
      >
        <SparkLine :points="trend" unit="sessions" label="Sessions" />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        title="What they have written"
        hint="counts only"
      >
        <BarRows :rows="documents" :slots="ROW_BUDGET.documents" empty="Nothing written yet" />
      </PanelCard>

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        title="Lifecycle"
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
            <p class="text-[0.86rem] text-ink">No operator has ever touched this account.</p>
            <p class="mt-1 max-w-[52ch] text-[0.78rem] text-muted">
              Opening this page is itself recorded, so the next visit will show one entry.
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
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import PlatformHeader from '@/components/layout/PlatformHeader.vue'
import BarRows from '@/components/charts/BarRows.vue'
import SparkLine from '@/components/charts/SparkLine.vue'
import StatTile from '@/components/charts/StatTile.vue'
import { foldOther } from '@/utils/breakdown'
import { fetchAccountDetail } from '@/services/admin.api'
import type { AccountDetail } from '@/types/analytics'

const ROW_BUDGET = { documents: 6 } as const

const route = useRoute()
const detail = ref<AccountDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const trend = computed(() =>
  (detail.value?.traffic ?? []).map((point) => ({ date: point.date, value: point.sessions })),
)

const documents = computed(() => foldOther(detail.value?.documents ?? [], ROW_BUDGET.documents))

onMounted(async () => {
  try {
    detail.value = await fetchAccountDetail(String(route.params.id))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'The account is not available'
  } finally {
    loading.value = false
  }
})
</script>
