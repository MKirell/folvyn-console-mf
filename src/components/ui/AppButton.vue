<template>
  <button
    :type="type"
    :disabled="disabled || busy"
    class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[9px] font-medium transition-[background-color,border-color,color,opacity] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
    :class="[VARIANTS[variant], SIZES[size]]"
  >
    <span
      v-if="busy"
      class="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    ></span>
    <slot />
  </button>
</template>

<script setup lang="ts">
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger'
export type ButtonSize = 'sm' | 'md'

withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    type?: 'button' | 'submit'
    disabled?: boolean
    busy?: boolean
  }>(),
  { variant: 'ghost', size: 'md', type: 'button', disabled: false, busy: false },
)

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-deep',
  secondary: 'border border-line/12 bg-line/8 text-ink hover:bg-line/16',
  ghost: 'border border-line/10 bg-surface text-ink-soft hover:border-accent/35 hover:text-ink',
  quiet: 'text-muted hover:bg-bg-tint hover:text-ink',
  danger: 'border border-rust/35 bg-surface text-rust hover:bg-rust/10',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-[5px] text-[0.76rem]',
  md: 'px-3.5 py-[7px] text-[0.82rem]',
}
</script>
