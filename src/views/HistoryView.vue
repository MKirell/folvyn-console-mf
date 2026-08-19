<template>
  <div class="mx-auto w-full max-w-[1180px] space-y-4">
    <header class="flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">
          {{ t('views.history.title') }}
        </h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          {{ t('views.history.blurb') }}
        </p>
      </div>
      <AppButton @click="exportJson">
        <Download :size="14" :stroke-width="1.9" aria-hidden="true" />
        {{ t('views.history.exportJson') }}
      </AppButton>
    </header>

    <PanelCard :title="t('views.history.undoStack')" :hint="`${history.entries.length}/20`" flush>
      <ul v-if="history.entries.length" class="divide-y divide-line/8" role="list">
        <li
          v-for="(entry, index) in history.entries"
          :key="entry.id"
          class="flex items-center gap-3 px-4 py-2.5"
        >
          <span class="font-mono text-[0.64rem] tabular-nums text-muted">{{ index + 1 }}</span>
          <span class="min-w-0 flex-1 truncate text-[0.84rem]">{{ entry.label }}</span>
          <span class="shrink-0 font-mono text-[0.66rem] text-muted">{{ time(entry.at) }}</span>
          <AppButton v-if="index === 0" size="sm" :busy="history.undoing" @click="undo">
            <Undo2 :size="13" :stroke-width="1.9" aria-hidden="true" />
            {{ t('views.history.undo') }}
          </AppButton>
        </li>
      </ul>

      <div v-else class="px-4 py-8">
        <p class="text-center text-[0.82rem] text-muted">
          {{ t('views.history.emptyUndo') }}
        </p>
      </div>
    </PanelCard>

    <PanelCard :title="t('views.history.snapshots')" :hint="t('views.history.snapshotsHint')" flush>
      <template #actions>
        <AppButton
          v-if="history.snapshots.length"
          size="sm"
          variant="danger"
          @click="clearing = true"
        >
          <Trash2 :size="13" :stroke-width="1.9" aria-hidden="true" />
          {{ t('views.history.clearSnapshots') }}
        </AppButton>
      </template>

      <ul v-if="history.snapshots.length" class="divide-y divide-line/8" role="list">
        <li
          v-for="snapshot in history.snapshots"
          :key="snapshot.id"
          class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5"
        >
          <span class="min-w-0 flex-1 max-600:basis-full">
            <span class="block truncate text-[0.84rem]">{{ snapshot.label }}</span>
            <span
              class="block truncate font-mono text-[0.64rem] text-muted"
              :title="snapshot.documentId"
              >{{ kindOf(snapshot.collection) }} · {{ snapshot.documentId }}</span
            >
          </span>
          <span class="shrink-0 font-mono text-[0.66rem] text-muted max-600:me-auto">{{
            time(snapshot.savedAt)
          }}</span>
          <AppButton size="sm" @click="download(snapshot)">
            <Download :size="13" :stroke-width="1.9" aria-hidden="true" />
            {{ t('views.history.download') }}
          </AppButton>
        </li>
      </ul>

      <div v-else class="px-4 py-8">
        <p class="text-center text-[0.82rem] text-muted">
          {{ t('blurbs.history') }}
        </p>
      </div>
    </PanelCard>
    <ConfirmDialog
      :open="clearing"
      :title="t('views.history.clearTitle')"
      :message="t('views.history.clearMessage')"
      :confirm-label="t('views.history.clearSnapshots')"
      @cancel="clearing = false"
      @confirm="clearSnapshots"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Download, Trash2, Undo2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import { COLLECTIONS } from '@/registry/collections'
import { collectionSingular } from '@/i18n/labels'
import { useContentStore } from '@/stores/content'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'
import type { Snapshot } from '@/services/snapshots'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const content = useContentStore()
const history = useHistoryStore()
const ui = useUiStore()

function time(at: number): string {
  return new Date(at).toLocaleString()
}

const clearing = ref(false)

function kindOf(key: string): string {
  const collection = COLLECTIONS[key]
  return collection ? collectionSingular(collection) : key
}

function save(name: string, payload: string): void {
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function exportJson(): void {
  save(`folvyn-portfolio-${new Date().toISOString().slice(0, 10)}.json`, content.exportAll())
  ui.notify('good', t('views.history.exported'))
}

function download(snapshot: Snapshot): void {
  save(
    `${snapshot.collection}-${snapshot.documentId}.json`,
    JSON.stringify(snapshot.document, null, 2),
  )
}

async function undo(): Promise<void> {
  try {
    const label = await history.undo()
    if (label) ui.notify('good', t('topbar.undone'), label)
  } catch (error) {
    ui.notify('bad', t('topbar.undoFailed'), error instanceof Error ? error.message : undefined)
  }
}

async function clearSnapshots(): Promise<void> {
  clearing.value = false
  await history.clearSnapshots()
  ui.notify('good', t('views.history.snapshotsCleared'))
}

onMounted(() => void history.loadSnapshots())
</script>
