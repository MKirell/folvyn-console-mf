<template>
  <span class="inline-flex items-center gap-1.5">
    <span
      class="inline-block h-[13px] w-[19px] shrink-0 rounded-[2px] border border-line/10 bg-cover bg-center bg-no-repeat"
      :style="url ? { backgroundImage: `url(&quot;${url}&quot;)` } : undefined"
      :class="url ? '' : 'bg-bg-tint'"
      role="img"
      :aria-label="code ? `Flag ${code}` : 'No flag'"
    ></span>
    <span v-if="showCode" class="font-mono text-[0.68rem] uppercase text-muted">{{
      code || '—'
    }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { flagUrl } from '@/utils/flags'

const props = withDefaults(defineProps<{ code?: string | null; showCode?: boolean }>(), {
  code: '',
  showCode: true,
})

const url = computed(() => flagUrl(props.code).value)
</script>
