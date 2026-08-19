<template>
  <ul class="space-y-1.5" role="status" :aria-label="label">
    <li
      v-for="row in rows"
      :key="row"
      class="flex items-center gap-3 rounded-[11px] border border-line/8 bg-surface px-3 py-2.5"
    >
      <SkeletonBar class="h-8 w-8 shrink-0 rounded-[8px]" />

      <div class="min-w-0 flex-1 space-y-1.5">
        <SkeletonBar class="h-3" :style="{ width: `${TITLES[row % TITLES.length]}%` }" />
        <SkeletonBar class="h-[9px]" :style="{ width: `${SUBTITLES[row % SUBTITLES.length]}%` }" />
      </div>

      <SkeletonBar class="h-3 w-20 shrink-0 max-700:hidden" />
      <SkeletonBar class="h-6 w-6 shrink-0 rounded-[7px]" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import SkeletonBar from '@/components/ui/SkeletonBar.vue'

withDefaults(defineProps<{ rows?: number; label?: string }>(), { rows: 5, label: 'Loading' })

const TITLES = [42, 28, 36, 24, 33]
const SUBTITLES = [22, 16, 26, 14, 19]
</script>
