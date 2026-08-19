<template>
  <div>
    <div class="flex flex-wrap items-baseline gap-2">
      <span class="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">{{
        t('views.locales.translated')
      }}</span>
      <span class="ms-auto font-mono text-[0.86rem] tabular-nums" :class="tone"
        >{{ progress.done }} / {{ progress.total }} · {{ progress.percent }}%</span
      >
    </div>

    <span class="mt-2 block h-2 overflow-hidden rounded-full bg-bg-tint">
      <span
        class="block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
        :class="bar"
        :style="{ width: `${progress.percent}%` }"
      ></span>
    </span>

    <p class="mt-2 text-[0.78rem] text-muted">{{ t('views.queue.blurb') }}</p>

    <div class="mt-4 space-y-3">
      <PanelCard
        v-for="group in progress.groups"
        :key="group.key"
        :title="group.label"
        :hint="`${doneIn(group)}/${group.tasks.length}`"
        flush
      >
        <ul class="divide-y divide-line/8" role="list">
          <li v-for="task in group.tasks" :key="task.key">
            <RouterLink
              :to="task.to"
              class="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg-tint"
            >
              <component
                :is="task.done ? CircleCheck : Circle"
                :size="16"
                :stroke-width="1.9"
                class="shrink-0"
                :class="task.done ? 'text-sage' : 'text-muted'"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[0.84rem]">{{ task.label }}</span>
                <span class="block truncate font-mono text-[0.66rem] text-muted">{{
                  task.detail
                }}</span>
              </span>
              <ChevronRight :size="14" :stroke-width="2" class="shrink-0 text-muted" />
            </RouterLink>
          </li>
        </ul>
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight, Circle, CircleCheck } from '@lucide/vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import { useContentStore } from '@/stores/content'
import { localeProgress, type QueueGroup } from '@/utils/locale-queue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ code: string }>()

const { t } = useI18n()
const content = useContentStore()

const progress = computed(() => localeProgress(content, props.code))

const tone = computed(() => {
  if (progress.value.percent >= 100) return 'text-sage'
  return progress.value.percent >= 50 ? 'text-gold' : 'text-rust'
})

const bar = computed(() => {
  if (progress.value.percent >= 100) return 'bg-sage'
  return progress.value.percent >= 50 ? 'bg-gold' : 'bg-rust'
})

function doneIn(group: QueueGroup): number {
  return group.tasks.filter((task) => task.done).length
}
</script>
