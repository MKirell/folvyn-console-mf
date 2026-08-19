<template>
  <div
    class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2"
    role="status"
    :aria-label="label || t('ui.loadingScreen')"
  >
    <div
      v-for="tile in tiles"
      :key="`tile-${tile}`"
      class="col-span-3 rounded-lg border border-line/8 bg-surface px-3.5 py-3 max-1000:col-span-3 max-600:col-span-1"
    >
      <SkeletonBar class="h-[9px] w-[58%]" />
      <SkeletonBar class="mt-[9px] h-[21px] w-[44%]" />
      <SkeletonBar class="mt-[9px] h-[9px] w-[72%]" />
    </div>

    <section
      v-for="(span, index) in panels"
      :key="`panel-${index}`"
      class="flex flex-col rounded-lg border border-line/8 bg-surface"
      :class="SPAN_CLASS[span] ?? SPAN_CLASS[12]"
    >
      <header class="flex items-center gap-3 border-b border-line/8 px-4 py-[11px]">
        <SkeletonBar class="h-[13px] w-32" />
        <SkeletonBar class="ml-auto h-[9px] w-20 max-600:hidden" />
      </header>

      <div class="flex min-h-0 flex-1 flex-col gap-2.5 p-4">
        <SkeletonBar
          v-for="row in rows"
          :key="row"
          class="h-[13px]"
          :style="{ width: `${WIDTHS[(index + row) % WIDTHS.length]}%` }"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import SkeletonBar from '@/components/ui/SkeletonBar.vue'
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{ tiles?: number; panels?: number[]; rows?: number; label?: string }>(), {
  tiles: 4,
  panels: () => [8, 4, 12],
  rows: 5,
  label: '',
})

const { t } = useI18n()

const SPAN_CLASS: Record<number, string> = {
  3: 'col-span-3 max-1000:col-span-3 max-600:col-span-2',
  4: 'col-span-4 max-1000:col-span-6 max-600:col-span-2',
  6: 'col-span-6 max-1000:col-span-6 max-600:col-span-2',
  8: 'col-span-8 max-1000:col-span-6 max-600:col-span-2',
  12: 'col-span-12 max-1000:col-span-6 max-600:col-span-2',
}

const WIDTHS = [88, 64, 76, 52, 70, 46]
</script>
