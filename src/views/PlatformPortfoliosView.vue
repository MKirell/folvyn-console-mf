<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">
          {{ t('platform.portfolios.title') }}
        </h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          Every account, and the ones worth a second look. Draft content stays private — suspension
          takes a portfolio offline, it never opens it.
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
      aria-:label="t('platform.portfolios.segments')"
    >
      <button
        v-for="entry in segments"
        :key="entry.key"
        type="button"
        class="flex items-center gap-1.5 rounded-[9px] border px-2.5 py-[5px] text-[0.76rem] transition-colors motion-reduce:transition-none"
        :class="
          entry.key === segment
            ? 'border-accent/40 bg-accent/12 text-accent-deep'
            : 'border-line/8 bg-surface text-ink-soft hover:border-line/20 hover:text-ink'
        "
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
        class="flex flex-wrap items-center gap-3 rounded-[11px] border border-line/8 bg-surface px-3 py-2.5"
      >
        <span class="min-w-0 flex-1">
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
      :title="pending?.action === 'erase' ? 'Queue an erasure?' : 'Suspend this portfolio?'"
      :message="
        pending?.action === 'erase'
          ? `/${pending?.row.slug} joins the erasure queue with a ${DEADLINE_DAYS}-day clock. Nothing is deleted until the cascade is run from that screen, and the request is recorded either way.`
          : `/${pending?.row.slug} goes offline immediately. The owner keeps their content and can be restored at any time.`
      "
      :confirm-word="pending?.action === 'erase' ? pending.row.slug : ''"
      :confirm-label="pending?.action === 'erase' ? 'Queue erasure' : 'Suspend'"
      @cancel="pending = null"
      @confirm="commit"
    >
      <input
        v-model="reason"
        type="text"
        :placeholder="t('platform.portfolios.reasonPlaceholder')"
        aria-:label="t('platform.portfolios.reason')"
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

type Segment = 'all' | 'published' | 'draft' | 'suspended' | 'recent' | 'thin' | 'silent' | 'risky'

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

const STATE_SEGMENTS: Segment[] = ['published', 'draft', 'suspended']

const COPY: Record<
  Segment,
  { label: string; hint: string; emptyTitle: string; emptyBody: string }
> = {
  all: {
    label: 'All',
    hint: '',
    emptyTitle: 'No portfolio matches',
    emptyBody: 'Nobody has signed up under that search yet.',
  },
  published: {
    label: 'Published',
    hint: '',
    emptyTitle: 'Nothing is published',
    emptyBody: 'No account has taken its portfolio public yet.',
  },
  draft: {
    label: 'Draft',
    hint: '',
    emptyTitle: 'No draft',
    emptyBody: 'Every account has published.',
  },
  suspended: {
    label: 'Suspended',
    hint: '',
    emptyTitle: 'Nothing is suspended',
    emptyBody: 'No operator has taken a portfolio offline.',
  },
  recent: {
    label: 'Newly published',
    hint: 'Went public in the last fourteen days — the window where a first look is worth the most.',
    emptyTitle: 'Nothing new',
    emptyBody: 'No portfolio has gone public in the last fortnight.',
  },
  thin: {
    label: 'Thin',
    hint: 'Published with almost nothing written. Usually an abandoned sign-up rather than abuse.',
    emptyTitle: 'No thin portfolio',
    emptyBody: 'Every published portfolio carries real content.',
  },
  silent: {
    label: 'Never visited',
    hint: 'Published, but no session has ever been recorded. Worth checking the address resolves.',
    emptyTitle: 'Everything gets traffic',
    emptyBody: 'Every published portfolio has been visited at least once.',
  },
  risky: {
    label: 'Confusable address',
    hint: 'One edit away from a word the platform reserves. Not blocked, but worth a human glance.',
    emptyTitle: 'No confusable address',
    emptyBody: 'No address sits close enough to a reserved word to mislead anyone.',
  },
}

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
  (Object.keys(COPY) as Segment[]).map((key) => ({
    key,
    label: COPY[key].label,
    count: buckets.value[key].length,
  })),
)

const active = computed(() => COPY[segment.value])
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
