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
        :hint="t('platform.erasure.waitingHint')"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.erasure.dueWeek')"
        :value="String(counts.urgent)"
        :hint="t('platform.erasure.dueHint')"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.erasure.completed')"
        :value="String(counts.done)"
        :hint="t('platform.erasure.completedHint')"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.erasure.failed')"
        :value="String(counts.failed)"
        :hint="t('platform.erasure.failedHint')"
      />

      <PanelCard
        class="col-span-12 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.erasure.requests')"
        :hint="t('platform.erasure.queueHint', { count: rows.length })"
      >
        <ul v-if="rows.length" class="flex min-h-0 flex-1 flex-col gap-2" role="list">
          <li
            v-for="row in rows"
            :key="row.id"
            class="flex min-w-0 flex-col gap-1.5 rounded-[9px] border px-3 py-2.5"
            :class="tone(row)"
          >
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span class="min-w-0 flex-1 basis-[11rem] truncate font-mono text-[0.8rem]"
                >/{{ row.slug }}</span
              >

              <span
                class="shrink-0 rounded-[5px] px-1.5 py-[1px] font-mono text-[0.62rem] uppercase"
                :class="badge(row)"
                >{{ state(row) }}</span
              >

              <span
                class="shrink-0 font-mono text-[0.72rem] tabular-nums"
                :class="row.daysLeft <= 7 && row.state !== 'done' ? 'text-gold' : 'text-muted'"
                >{{ clock(row) }}</span
              >

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

            <div
              class="h-[3px] w-full overflow-hidden rounded-full bg-line/12"
              role="img"
              :aria-label="clock(row)"
            >
              <div
                class="h-full rounded-full transition-[width] motion-reduce:transition-none"
                :class="bar(row)"
                :style="{ width: `${elapsed(row)}%` }"
              />
            </div>

            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p class="min-w-0 flex-1 truncate text-[0.74rem] text-muted">
                {{ row.reason
                }}<span v-if="row.requestedBy">
                  — {{ t('platform.erasure.askedBy', { actor: row.requestedBy }) }}</span
                >
              </p>
              <span class="min-w-0 font-mono text-[0.7rem] break-words text-muted">{{
                cascade(row)
              }}</span>
            </div>

            <p v-if="row.failure" class="text-[0.74rem] text-rust">{{ row.failure }}</p>
          </li>
        </ul>

        <div v-else class="grid flex-1 place-items-center py-6 text-center">
          <div>
            <p class="text-[0.86rem] text-ink">{{ t('platform.erasure.none') }}</p>
            <p class="mt-1 max-w-[46ch] text-[0.78rem] text-muted">
              {{ t('platform.erasure.noneDesc', { days: deadlineDays }) }}
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

const { t, te } = useI18n()
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

function badge(row: ErasureRow): string {
  if (row.state === 'failed') return 'bg-rust/15 text-rust'
  if (row.state === 'done') return 'bg-sage/15 text-sage'
  if (row.daysLeft <= 7) return 'bg-gold/15 text-gold'
  return 'bg-line/10 text-muted'
}

function bar(row: ErasureRow): string {
  if (row.state === 'failed') return 'bg-rust'
  if (row.state === 'done') return 'bg-sage'
  return row.daysLeft <= 7 ? 'bg-gold' : 'bg-accent'
}

function elapsed(row: ErasureRow): number {
  if (row.state === 'done') return 100
  const used = deadlineDays - row.daysLeft
  return Math.max(2, Math.min(100, Math.round((used / deadlineDays) * 100)))
}

function clock(row: ErasureRow): string {
  if (row.state === 'done') return row.completedAt?.slice(0, 10) ?? ''
  if (row.daysLeft < 0) return t('platform.erasure.overdue', { days: Math.abs(row.daysLeft) })
  return t('platform.erasure.daysLeft', { days: row.daysLeft })
}

function state(row: ErasureRow): string {
  return te(`platform.erasure.state.${row.state}`)
    ? t(`platform.erasure.state.${row.state}`)
    : row.state
}

function cascade(row: ErasureRow): string {
  const entries = Object.entries(row.cascade)
  if (entries.length === 0) return t('platform.erasure.cascadeNotRun')
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
