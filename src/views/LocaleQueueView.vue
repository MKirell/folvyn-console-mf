<template>
  <div class="mx-auto w-full max-w-[900px]">
    <header class="mb-5">
      <AppButton size="sm" variant="quiet" class="mb-2" @click="router.push('/locales')">
        <ArrowLeft :size="14" :stroke-width="2" aria-hidden="true" />
        Locales
      </AppButton>

      <div class="flex flex-wrap items-center gap-3">
        <FlagBadge :code="flagCode" :show-code="false" />
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight uppercase">{{ label }}</h2>
        <span class="ms-auto font-mono text-[0.86rem] tabular-nums text-ink-soft"
          >{{ progress.done }} / {{ progress.total }}</span
        >
      </div>

      <span class="mt-2.5 block h-2 overflow-hidden rounded-full bg-bg-tint">
        <span
          class="block h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
          :style="{ width: `${progress.percent}%` }"
        ></span>
      </span>
      <p class="mt-1.5 text-[0.78rem] text-muted">
        Work top to bottom — nothing below the foundation renders until those two exist.
      </p>
    </header>

    <div class="space-y-3">
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
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronRight, Circle, CircleCheck } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import FlagBadge from '@/components/ui/FlagBadge.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import { useContentStore } from '@/stores/content'
import { localeProgress, type QueueGroup } from '@/utils/locale-queue'

const route = useRoute()
const router = useRouter()
const content = useContentStore()

const code = computed(() => String(route.params.code))
const locale = computed(() => content.locales.find((entry) => entry.code === code.value))
const label = computed(() => locale.value?.label ?? code.value)
const flagCode = computed(() => locale.value?.flagCode ?? '')

const progress = computed(() => localeProgress(content, code.value))

function doneIn(group: QueueGroup): number {
  return group.tasks.filter((task) => task.done).length
}
</script>
