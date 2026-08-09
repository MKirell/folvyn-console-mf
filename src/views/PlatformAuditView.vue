<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4">
      <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">Audit</h2>
      <p class="mt-0.5 text-[0.78rem] text-muted">
        Every platform action, append-only. Nothing here can be edited or removed.
      </p>
    </header>

    <div v-if="loading" class="grid place-items-center py-20" role="status">
      <span
        class="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40"
      ></span>
    </div>

    <EmptyState
      v-else-if="entries.length === 0"
      icon="History"
      title="Nothing has happened yet"
      :description="error ?? 'Suspensions, erasures and exports are recorded here.'"
    />

    <ul v-else class="space-y-1.5" role="list">
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="flex flex-wrap items-center gap-3 rounded-[11px] border border-line/8 bg-surface px-3 py-2.5"
      >
        <span
          class="shrink-0 rounded-[5px] px-1.5 py-[1px] font-mono text-[0.62rem] uppercase"
          :class="ACTION_CLASS[entry.action] ?? 'bg-line/10 text-muted'"
          >{{ entry.action }}</span
        >

        <span class="min-w-0 flex-1">
          <span class="block truncate font-mono text-[0.78rem]"
            >/{{ entry.targetSlug ?? '—' }}</span
          >
          <span v-if="entry.reason" class="block truncate text-[0.72rem] text-muted">{{
            entry.reason
          }}</span>
        </span>

        <span class="shrink-0 text-[0.72rem] text-muted">{{
          entry.actorEmail ?? entry.actorSub
        }}</span>
        <span class="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted">{{
          when(entry.createdAt)
        }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { fetchAuditLog } from '@/services/admin.api'
import type { AuditEntry } from '@/types/analytics'

const ACTION_CLASS: Record<string, string> = {
  erase: 'bg-rust/15 text-rust',
  suspend: 'bg-gold/15 text-gold',
  restore: 'bg-sage/15 text-sage',
}

const entries = ref<AuditEntry[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function when(value: string): string {
  return new Date(value).toISOString().slice(0, 16).replace('T', ' ')
}

onMounted(async () => {
  try {
    entries.value = await fetchAuditLog()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'The audit log is unavailable'
  } finally {
    loading.value = false
  }
})
</script>
