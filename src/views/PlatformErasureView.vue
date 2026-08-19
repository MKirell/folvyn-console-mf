<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <PlatformHeader
      :title="t('platform.erasure.title')"
      :description="t('platform.erasure.blurb')"
    />

    <SkeletonGrid v-if="loading" :panels="[12]" :rows="6" :label="t('platform.erasure.title')" />

    <EmptyState v-else-if="error" icon="Shield" :title="t('errors.erasure')" :description="error">
      <AppButton variant="primary" @click="load">{{ t('common.retry') }}</AppButton>
    </EmptyState>

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.erasure.waiting')"
        :value="String(counts.pending)"
        hint="not yet run"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.erasure.dueWeek')"
        :value="String(counts.urgent)"
        hint="the clock is short"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.erasure.completed')"
        :value="String(counts.done)"
        hint="cascade finished"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.erasure.failed')"
        :value="String(counts.failed)"
        hint="needs a retry"
      />

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.erasure.requests')"
        :hint="`${rows.length} in the queue`"
      >
        <ul v-if="rows.length" class="flex min-h-0 flex-1 flex-col gap-2" role="list">
          <li
            v-for="row in rows"
            :key="row.id"
            class="flex flex-col gap-1.5 rounded-[9px] border px-3 py-2.5"
            :class="tone(row)"
          >
            <div class="flex flex-wrap items-center gap-3">
              <span class="min-w-0 flex-1 truncate font-mono text-[0.8rem]">/{{ row.slug }}</span>

              <span
                class="shrink-0 rounded-[5px] bg-line/10 px-1.5 py-[1px] font-mono text-[0.62rem] uppercase"
                >{{ row.state }}</span
              >

              <span class="shrink-0 font-mono text-[0.72rem] tabular-nums text-muted">{{
                clock(row)
              }}</span>

              <span class="shrink-0 font-mono text-[0.7rem] text-muted">{{ cascade(row) }}</span>

              <AppButton
                v-if="row.state !== 'done'"
                size="sm"
                variant="ghost"
                :disabled="running === row.id"
                @click="run(row)"
                >{{
                  row.state === 'failed' ? t('common.retry') : t('platform.erasure.runNow')
                }}</AppButton
              >
            </div>

            <p class="text-[0.74rem] text-muted">
              {{ row.reason }}<span v-if="row.requestedBy"> — asked by {{ row.requestedBy }}</span>
              <span v-if="row.failure" class="text-rust"> · {{ row.failure }}</span>
            </p>
          </li>
        </ul>

        <div v-else class="grid flex-1 place-items-center py-6 text-center">
          <div>
            <p class="text-[0.86rem] text-ink">{{ t('platform.erasure.none') }}</p>
            <p class="mt-1 max-w-[46ch] text-[0.78rem] text-muted">
              A request gets {{ deadlineDays }} days. Queue one from an account, run the cascade,
              and this screen records what each store removed.
            </p>
          </div>
        </div>
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import SkeletonGrid from '@/components/ui/SkeletonGrid.vue'
import PlatformHeader from '@/components/layout/PlatformHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import StatTile from '@/components/charts/StatTile.vue'
import { fetchErasures, runErasure } from '@/services/admin.api'
import { useUiStore } from '@/stores/ui'
import type { ErasureRow } from '@/types/analytics'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const deadlineDays = 30

const rows = ref<ErasureRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const running = ref<string | null>(null)
const ui = useUiStore()

const counts = computed(() => ({
  pending: rows.value.filter((row) => row.state === 'pending').length,
  urgent: rows.value.filter((row) => row.state === 'pending' && row.daysLeft <= 7).length,
  done: rows.value.filter((row) => row.state === 'done').length,
  failed: rows.value.filter((row) => row.state === 'failed').length,
}))

function tone(row: ErasureRow): string {
  if (row.state === 'failed') return 'border-rust/25 bg-rust/6'
  if (row.state === 'done') return 'border-sage/25 bg-sage/6'
  if (row.daysLeft <= 7) return 'border-gold/25 bg-gold/6'
  return 'border-line/8 bg-bg'
}

function clock(row: ErasureRow): string {
  if (row.state === 'done') return `done ${row.completedAt?.slice(0, 10) ?? ''}`
  if (row.daysLeft < 0) return `${Math.abs(row.daysLeft)}d overdue`
  return `${row.daysLeft}d left`
}

function cascade(row: ErasureRow): string {
  const entries = Object.entries(row.cascade)
  if (entries.length === 0) return 'not run yet'
  return entries.map(([store, count]) => `${store} ${count}`).join(' · ')
}

async function run(row: ErasureRow): Promise<void> {
  running.value = row.id

  try {
    const updated = await runErasure(row.id)
    rows.value = rows.value.map((entry) => (entry.id === updated.id ? updated : entry))
    ui.notify(
      updated.state === 'done' ? 'good' : 'bad',
      updated.state === 'done' ? `Erased /${updated.slug}` : `Erasure failed for /${updated.slug}`,
      updated.failure ?? undefined,
    )
  } catch (e) {
    ui.notify('bad', e instanceof Error ? e.message : 'Erasure failed')
  } finally {
    running.value = null
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    rows.value = await fetchErasures()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'The queue is not available'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>
