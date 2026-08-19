<template>
  <div class="mx-auto w-full max-w-[1180px]" role="status" :aria-label="`Loading ${heading}`">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">{{ heading }}</h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">{{ blurb }}</p>
      </div>
      <AppButton variant="primary" disabled>{{ t('common.save') }}</AppButton>
    </header>

    <div class="space-y-4">
      <PanelCard v-for="group in GROUPS" :key="group.title" :title="group.title">
        <div class="grid grid-cols-3 gap-x-4 gap-y-3.5 max-900:grid-cols-2 max-700:grid-cols-1">
          <div v-for="field in group.fields" :key="field" class="space-y-1.5">
            <SkeletonBar class="h-[9px] w-20" />
            <SkeletonBar class="h-[38px] w-full rounded-[9px]" />
          </div>
        </div>
      </PanelCard>

      <PanelCard :title="t('views.singleton.translations')">
        <div class="space-y-3">
          <div v-for="row in 3" :key="row" class="space-y-1.5">
            <SkeletonBar class="h-[9px] w-24" />
            <SkeletonBar class="h-[38px] w-full rounded-[9px]" />
          </div>
        </div>
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import SkeletonBar from '@/components/ui/SkeletonBar.vue'
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{ heading?: string; blurb?: string }>(), { heading: '', blurb: '' })

const { t } = useI18n()
const GROUPS = [
  { title: 'Details', fields: 6 },
  { title: 'Files', fields: 2 },
]
</script>
