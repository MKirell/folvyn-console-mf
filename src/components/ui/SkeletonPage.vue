<template>
  <div class="mx-auto w-full max-w-[1180px]" role="status" :aria-label="t('ui.loadingScreen')">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 space-y-1.5 max-700:basis-full">
        <SkeletonBar class="h-[18px] w-40" />
        <SkeletonBar class="h-[10px] w-[52%]" />
      </div>
    </header>

    <div class="space-y-4">
      <PanelCard v-for="panel in 2" :key="panel">
        <template #title><SkeletonBar class="h-[11px] w-28" /></template>
        <template #hint><SkeletonBar class="ms-auto h-[9px] w-32" /></template>
        <div class="grid grid-cols-3 gap-x-4 gap-y-3.5 max-900:grid-cols-2 max-700:grid-cols-1">
          <div v-for="field in 6" :key="field" class="space-y-1.5">
            <SkeletonBar class="h-[9px] w-20" />
            <SkeletonBar class="h-[38px] w-full rounded-[9px]" />
          </div>
        </div>
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import PanelCard from '@/components/ui/PanelCard.vue'
import SkeletonBar from '@/components/ui/SkeletonBar.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
