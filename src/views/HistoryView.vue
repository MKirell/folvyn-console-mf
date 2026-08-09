<template>
  <div class="mx-auto w-full max-w-[900px] space-y-4">
    <header class="flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">History</h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          Atlas M0 has no backups, so the export below is the backup.
        </p>
      </div>
      <AppButton @click="exportJson">
        <Download :size="14" :stroke-width="1.9" aria-hidden="true" />
        Export JSON
      </AppButton>
    </header>

    <PanelCard title="Undo stack" :hint="`${history.entries.length}/20`" flush>
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
            Undo
          </AppButton>
        </li>
      </ul>

      <div v-else class="px-4 py-8">
        <p class="text-center text-[0.82rem] text-muted">
          Nothing to undo yet. The stack lives in this tab only.
        </p>
      </div>
    </PanelCard>

    <PanelCard title="Local snapshots" hint="kept 7 days" flush>
      <ul v-if="history.snapshots.length" class="divide-y divide-line/8" role="list">
        <li
          v-for="snapshot in history.snapshots"
          :key="snapshot.id"
          class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5"
        >
          <span class="min-w-0 flex-1 max-600:basis-full">
            <span class="block truncate text-[0.84rem]">{{ snapshot.label }}</span>
            <span class="block truncate font-mono text-[0.64rem] text-muted"
              >{{ snapshot.collection }} · {{ snapshot.documentId }}</span
            >
          </span>
          <span class="shrink-0 font-mono text-[0.66rem] text-muted max-600:me-auto">{{
            time(snapshot.savedAt)
          }}</span>
          <AppButton size="sm" @click="download(snapshot)">
            <Download :size="13" :stroke-width="1.9" aria-hidden="true" />
            Download
          </AppButton>
        </li>
      </ul>

      <div v-else class="px-4 py-8">
        <p class="text-center text-[0.82rem] text-muted">
          Every save writes the previous document here before it leaves the browser.
        </p>
      </div>
    </PanelCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Download, Undo2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import { useContentStore } from '@/stores/content'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'
import type { Snapshot } from '@/services/snapshots'

const content = useContentStore()
const history = useHistoryStore()
const ui = useUiStore()

function time(at: number): string {
  return new Date(at).toLocaleString()
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
  ui.notify('good', 'Export downloaded')
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
    if (label) ui.notify('good', 'Change undone', label)
  } catch (error) {
    ui.notify('bad', 'Undo failed', error instanceof Error ? error.message : undefined)
  }
}

onMounted(() => void history.loadSnapshots())
</script>
