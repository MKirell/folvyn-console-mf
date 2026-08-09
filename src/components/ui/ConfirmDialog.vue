<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[125] grid place-items-center bg-scrim/40 px-4 backdrop-blur-[6px]"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click.self="emit('cancel')"
    >
      <div
        class="w-full max-w-[420px] rounded-lg border border-line/10 bg-surface p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] animate-fade-up"
      >
        <h2 class="font-disp text-[1rem] font-semibold tracking-tight">{{ title }}</h2>
        <p class="mt-2 text-[0.84rem] text-ink-soft">
          <strong v-if="subject" class="font-semibold text-ink">{{ subject }}</strong>
          {{ message }}
        </p>

        <label v-if="confirmWord" class="mt-4 block">
          <span class="text-[0.78rem] text-ink-soft">
            Type <span class="font-mono text-ink">“{{ confirmWord }}”</span> to confirm
          </span>
          <input
            ref="inputRef"
            v-model="typed"
            type="text"
            class="mt-1.5 w-full rounded-[9px] border border-line/10 bg-bg px-3 py-2 font-mono text-[0.82rem] outline-none focus:border-accent/50"
            @keydown.enter="ready && emit('confirm')"
            @keydown.esc="emit('cancel')"
          />
        </label>

        <div v-if="$slots.default" class="mt-4">
          <slot />
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <AppButton size="sm" @click="emit('cancel')">Cancel</AppButton>
          <AppButton size="sm" variant="danger" :disabled="!ready" @click="emit('confirm')">
            {{ confirmLabel }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    subject?: string
    confirmLabel?: string
    confirmWord?: string
  }>(),
  { subject: '', confirmLabel: 'Delete', confirmWord: '' },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const typed = ref('')

const ready = computed(() => !props.confirmWord || typed.value.trim() === props.confirmWord)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    typed.value = ''
    await nextTick()
    inputRef.value?.focus()
  },
)
</script>
