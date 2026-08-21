<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">
          {{ t('platform.portfolios.title') }}
        </h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          {{ t('platform.portfolios.blurb') }}
        </p>
      </div>

      <input
        v-model="query"
        type="search"
        :placeholder="t('platform.portfolios.searchPlaceholder')"
        aria-:label="t('platform.portfolios.search')"
        class="rounded-[9px] border border-line/8 bg-surface px-3 py-[7px] text-[0.8rem] outline-none focus:border-accent/50"
        @input="reload"
      />
    </header>

    <div
      class="mb-3 flex flex-wrap items-center gap-1.5"
      role="group"
      :aria-label="t('platform.portfolios.segments')"
    >
      <button
        v-for="entry in segments"
        :key="entry.key"
        type="button"
        class="flex items-center gap-1.5 rounded-[9px] border px-2.5 py-[5px] text-[0.76rem] transition-colors motion-reduce:transition-none"
        :class="segmentClass(entry.key)"
        :aria-pressed="entry.key === segment"
        @click="select(entry.key)"
      >
        {{ entry.label }}
        <span class="font-mono text-[0.66rem] tabular-nums opacity-70">{{ entry.count }}</span>
      </button>
    </div>

    <p v-if="active.hint" class="mb-3 text-[0.78rem] text-muted">{{ active.hint }}</p>

    <SkeletonList v-if="loading" :rows="8" :label="t('platform.portfolios.title')" />

    <EmptyState
      v-else-if="error"
      icon="Shield"
      :title="t('errors.portfolios')"
      :description="error"
    >
      <AppButton variant="primary" @click="reload">{{ t('common.retry') }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="visible.length === 0"
      icon="Users"
      :title="active.emptyTitle"
      :description="active.emptyBody"
    />

    <ul v-else class="space-y-1.5" role="list">
      <li
        v-for="entry in visible"
        :key="entry.row.id"
        class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[11px] border border-line/8 bg-surface px-3 py-2.5"
      >
        <span class="min-w-0 flex-1 basis-[14rem]">
          <RouterLink
            :to="`/platform/portfolios/${entry.row.id}`"
            class="block truncate font-mono text-[0.8rem] hover:text-accent-deep"
            >/{{ entry.row.slug }}</RouterLink
          >
          <span class="block truncate text-[0.7rem] text-muted">{{
            entry.note ?? entry.row.email ?? '—'
          }}</span>
        </span>

        <span
          class="shrink-0 rounded-[5px] px-1.5 py-[1px] font-mono text-[0.62rem] uppercase"
          :class="STATE_CLASS[entry.row.status] ?? 'bg-line/10 text-muted'"
          >{{ entry.row.status }}</span
        >

        <span
          class="w-20 shrink-0 text-end font-mono text-[0.72rem] tabular-nums text-muted"
          :title="t('platform.portfolios.sessionsWindow')"
          >{{ entry.row.visitors.toLocaleString() }} v</span
        >

        <span class="flex shrink-0 items-center gap-1">
          <AppButton
            v-if="entry.row.status !== 'suspended'"
            size="sm"
            variant="secondary"
            @click="ask(entry.row, 'suspend')"
            >{{ t('platform.portfolios.suspend') }}</AppButton
          >
          <AppButton v-else size="sm" variant="secondary" @click="restoreOne(entry.row)">{{
            t('platform.portfolios.restore')
          }}</AppButton>
          <AppButton size="sm" variant="secondary" @click="exportOne(entry.row)">{{
            t('platform.portfolios.export')
          }}</AppButton>
          <AppButton size="sm" variant="danger" @click="ask(entry.row, 'erase')">{{
            t('platform.portfolios.queueErasure')
          }}</AppButton>
        </span>
      </li>
    </ul>

    <ConfirmDialog
      :open="pending !== null"
      :title="
        pending?.action === 'erase'
          ? t('platform.portfolios.eraseTitle')
          : t('platform.portfolios.suspendTitle')
      "
      :message="
        pending?.action === 'erase'
          ? t('platform.portfolios.eraseMessage', {
              slug: pending?.row.slug,
              days: DEADLINE_DAYS,
            })
          : t('platform.portfolios.suspendMessage', { slug: pending?.row.slug })
      "
      :confirm-word="pending?.action === 'erase' ? pending.row.slug : ''"
      :confirm-label="
        pending?.action === 'erase'
          ? t('platform.portfolios.queueErasure')
          : t('platform.portfolios.suspend')
      "
      @cancel="pending = null"
      @confirm="commit"
    >
      <input
        v-model="reason"
        type="text"
        :placeholder="t('platform.portfolios.reasonPlaceholder')"
        :aria-label="t('platform.portfolios.reason')"
        class="w-full h-[38px] rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.82rem] outline-none focus:border-accent/50"
      />
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import {
  exportPortfolio,
  fetchModeration,
  fetchPortfolios,
  queueErasure,
  restorePortfolio,
  suspendPortfolio,
} from '@/services/admin.api'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'
import type { ModerationBoard, PortfolioRow } from '@/types/analytics'

const SEGMENT_KEYS = [
  'all',
  'published',
  'draft',
  'suspended',
  'recent',
  'thin',
  'silent',
  'risky',
] as const

type Segment = (typeof SEGMENT_KEYS)[number]

interface Entry {
  row: PortfolioRow
  note?: string
}

const { t } = useI18n()
const DEADLINE_DAYS = 30

const STATE_CLASS: Record<string, string> = {
  published: 'bg-sage/15 text-sage',
  suspended: 'bg-rust/15 text-rust',
}

const SEGMENT_ON: Partial<Record<Segment, string>> = {
  published: 'border-sage/40 bg-sage/15 text-sage',
  draft: 'border-line/25 bg-line/10 text-ink-soft',
  suspended: 'border-rust/40 bg-rust/15 text-rust',
}

const SEGMENT_OFF: Partial<Record<Segment, string>> = {
  published: 'border-line/8 bg-surface text-sage/75 hover:border-sage/30 hover:text-sage',
  draft: 'border-line/8 bg-surface text-muted hover:border-line/20 hover:text-ink-soft',
  suspended: 'border-line/8 bg-surface text-rust/75 hover:border-rust/30 hover:text-rust',
}

function segmentClass(key: Segment): string {
  if (key === segment.value) {
    return SEGMENT_ON[key] ?? 'border-accent/40 bg-accent/12 text-accent-deep'
  }
  return (
    SEGMENT_OFF[key] ?? 'border-line/8 bg-surface text-ink-soft hover:border-line/20 hover:text-ink'
  )
}

const STATE_SEGMENTS: Segment[] = ['published', 'draft', 'suspended']

const copy = computed(
  () =>
    Object.fromEntries(
      SEGMENT_KEYS.map((key) => [
        key,
        {
          label: t(`platform.portfolios.segment.${key}.label`),
          hint: t(`platform.portfolios.segment.${key}.hint`),
          emptyTitle: t(`platform.portfolios.segment.${key}.emptyTitle`),
          emptyBody: t(`platform.portfolios.segment.${key}.emptyBody`),
        },
      ]),
    ) as Record<Segment, { label: string; hint: string; emptyTitle: string; emptyBody: string }>,
)

const ui = useUiStore()

const rows = ref<PortfolioRow[]>([])
const board = ref<ModerationBoard>({
  recentlyPublished: [],
  suspended: [],
  nearMisses: [],
  thin: [],
  silent: [],
})
const loading = ref(true)
const error = ref<string | null>(null)
const query = ref('')
const segment = ref<Segment>('all')
const reason = ref('')
const pending = ref<{ row: PortfolioRow; action: 'suspend' | 'erase' } | null>(null)

const byId = computed(() => new Map(rows.value.map((row) => [row.id, row])))

const thinEntries = computed<Entry[]>(() =>
  board.value.thin.flatMap((entry) => {
    const row = byId.value.get(entry.id)
    if (!row) return []
    return [{ row, note: `${entry.documents} document${entry.documents === 1 ? '' : 's'}` }]
  }),
)

const riskyEntries = computed<Entry[]>(() => {
  const reserved = new Map(board.value.nearMisses.map((miss) => [miss.slug, miss.reserved]))

  return rows.value
    .filter((row) => reserved.has(row.slug))
    .map((row) => ({ row, note: `reads like “${reserved.get(row.slug)}”` }))
})

const buckets = computed<Record<Segment, Entry[]>>(() => ({
  all: rows.value.map((row) => ({ row })),
  published: rows.value.filter((row) => row.status === 'published').map((row) => ({ row })),
  draft: rows.value.filter((row) => row.status === 'draft').map((row) => ({ row })),
  suspended: rows.value.filter((row) => row.status === 'suspended').map((row) => ({ row })),
  recent: board.value.recentlyPublished.map((row) => ({
    row,
    note: `published ${published(row)}`,
  })),
  thin: thinEntries.value,
  silent: board.value.silent.map((row) => ({ row, note: 'no session recorded' })),
  risky: riskyEntries.value,
}))

const segments = computed(() =>
  SEGMENT_KEYS.map((key) => ({
    key,
    label: copy.value[key].label,
    count: buckets.value[key].length,
  })),
)

const active = computed(() => copy.value[segment.value])
const visible = computed(() => buckets.value[segment.value])

function published(row: PortfolioRow): string {
  return row.publishedAt ? row.publishedAt.slice(0, 10) : 'recently'
}

function select(next: Segment): void {
  segment.value = next
  if (STATE_SEGMENTS.includes(next) || next === 'all') void reload()
}

async function reload(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    const [list, moderation] = await Promise.all([
      fetchPortfolios(query.value, ''),
      fetchModeration().catch(() => board.value),
    ])
    rows.value = list
    board.value = moderation
  } catch (cause) {
    rows.value = []
    error.value = cause instanceof Error ? cause.message : 'The portfolio list is unavailable'
  } finally {
    loading.value = false
  }
}

function ask(row: PortfolioRow, action: 'suspend' | 'erase'): void {
  reason.value = ''
  pending.value = { row, action }
}

async function commit(): Promise<void> {
  const request = pending.value
  if (!request) return

  if (!reason.value.trim()) {
    ui.notify('bad', t('platform.reasonRequired'), t('platform.reasonRequiredDetail'))
    return
  }

  try {
    if (request.action === 'suspend') {
      await suspendPortfolio(request.row.id, reason.value)
      ui.notify('good', `/${request.row.slug} suspended`)
    } else {
      const queued = await queueErasure(request.row.id, reason.value)
      ui.notify(
        'good',
        `/${request.row.slug} queued for erasure`,
        `${queued.daysLeft} days on the clock. Run the cascade from the erasure queue.`,
      )
    }

    await reload()
  } catch (cause) {
    ui.notify(
      'bad',
      t('views.portfolio.failed'),
      cause instanceof Error ? cause.message : undefined,
    )
  } finally {
    pending.value = null
  }
}

async function restoreOne(row: PortfolioRow): Promise<void> {
  try {
    await restorePortfolio(row.id)
    ui.notify('good', `/${row.slug} restored`)
    await reload()
  } catch (cause) {
    ui.notify(
      'bad',
      t('views.portfolio.failed'),
      cause instanceof Error ? cause.message : undefined,
    )
  }
}

async function exportOne(row: PortfolioRow): Promise<void> {
  try {
    const data = await exportPortfolio(row.id)
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `${row.slug}.json`
    link.click()
    URL.revokeObjectURL(url)
  } catch (cause) {
    ui.notify(
      'bad',
      t('views.portfolio.exportFailed'),
      cause instanceof Error ? cause.message : undefined,
    )
  }
}

onMounted(() => void reload())
</script>
