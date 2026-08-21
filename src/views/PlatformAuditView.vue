<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4">
      <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">
        {{ t('platform.audit.title') }}
      </h2>
      <p class="mt-0.5 text-[0.78rem] text-muted">
        {{ t('platform.auditBlurb') }}
      </p>
    </header>

    <SkeletonList v-if="loading" :rows="8" :label="t('platform.audit.title')" />

    <EmptyState v-else-if="error" icon="Shield" :title="t('errors.audit')" :description="error">
      <AppButton variant="primary" @click="load">{{ t('common.retry') }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="entries.length === 0"
      icon="History"
      :title="t('platform.audit.none')"
      :description="t('platform.audit.noneDesc')"
    />

    <ul v-else class="space-y-1.5" role="list">
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[11px] border border-line/8 bg-surface px-3 py-2.5"
      >
        <span
          class="shrink-0 rounded-[5px] px-1.5 py-[1px] font-mono text-[0.62rem] uppercase"
          :class="ACTION_CLASS[entry.action] ?? 'bg-line/10 text-muted'"
          >{{ entry.action }}</span
        >

        <span class="min-w-0 flex-1 basis-[14rem]">
          <span class="block truncate font-mono text-[0.78rem]"
            >/{{ entry.targetSlug ?? '—' }}</span
          >
          <span v-if="entry.reason" class="block truncate text-[0.72rem] text-muted">{{
            entry.reason
          }}</span>
        </span>

        <span class="min-w-0 shrink truncate text-[0.72rem] text-muted">{{
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
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import { fetchAuditLog } from '@/services/admin.api'
import type { AuditEntry } from '@/types/analytics'
import { useI18n } from 'vue-i18n'

const ACTION_CLASS: Record<string, string> = {
  erase: 'bg-rust/15 text-rust',
  suspend: 'bg-gold/15 text-gold',
  restore: 'bg-sage/15 text-sage',
}

const { t } = useI18n()
const entries = ref<AuditEntry[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function when(value: string): string {
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return '—'
  return at.toISOString().slice(0, 16).replace('T', ' ')
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    entries.value = await fetchAuditLog()
  } catch (cause) {
    entries.value = []
    error.value = cause instanceof Error ? cause.message : 'The audit log is unavailable'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>
