<template>
  <div class="mx-auto w-full max-w-[900px]">
    <header class="mb-5">
      <AppButton size="sm" variant="quiet" class="mb-2" @click="router.push('/locales')">
        <ArrowLeft :size="14" :stroke-width="2" aria-hidden="true" />
        {{ t('views.queue.back') }}
      </AppButton>

      <div class="flex flex-wrap items-center gap-3">
        <FlagBadge :code="flagCode" :show-code="false" />
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight uppercase">{{ label }}</h2>
      </div>

      <LocaleWorkQueue :code="code" />
    </header>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import FlagBadge from '@/components/ui/FlagBadge.vue'
import LocaleWorkQueue from '@/components/locale/LocaleWorkQueue.vue'
import { useContentStore } from '@/stores/content'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const content = useContentStore()

const code = computed(() => String(route.params.code))
const locale = computed(() => content.locales.find((entry) => entry.code === code.value))
const label = computed(() => locale.value?.label ?? code.value)
const flagCode = computed(() => locale.value?.flagCode ?? '')
</script>
