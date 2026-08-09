import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const RAIL_KEY = 'console_rail_collapsed'
const LANG_KEY = 'console_editing_lang'
const TOAST_MS = 4200

export type ToastTone = 'info' | 'good' | 'warn' | 'bad'

export interface Toast {
  id: string
  tone: ToastTone
  message: string
  detail?: string
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function readString(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    void 0
  }
}

export const useUiStore = defineStore('ui', () => {
  const railCollapsed = ref(readFlag(RAIL_KEY))
  const mobileNavOpen = ref(false)
  const editingLang = ref(readString(LANG_KEY))
  const paletteOpen = ref(false)
  const dirty = ref(false)
  const toasts = ref<Toast[]>([])

  watch(railCollapsed, (value) => write(RAIL_KEY, value ? '1' : '0'))
  watch(editingLang, (value) => value && write(LANG_KEY, value))

  const hasToasts = computed(() => toasts.value.length > 0)

  function toggleRail(): void {
    railCollapsed.value = !railCollapsed.value
  }

  function setEditingLang(lang: string): void {
    editingLang.value = lang
  }

  function reconcileEditingLang(available: string[], fallback: string): void {
    if (available.length === 0) return
    if (editingLang.value && available.includes(editingLang.value)) return
    editingLang.value = available.includes(fallback) ? fallback : available[0]
  }

  function dismiss(id: string): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function notify(tone: ToastTone, message: string, detail?: string): void {
    const toast: Toast = { id: crypto.randomUUID(), tone, message, detail }
    toasts.value = [...toasts.value, toast]
    window.setTimeout(() => dismiss(toast.id), TOAST_MS)
  }

  return {
    railCollapsed,
    mobileNavOpen,
    editingLang,
    paletteOpen,
    dirty,
    toasts,
    hasToasts,
    toggleRail,
    setEditingLang,
    reconcileEditingLang,
    notify,
    dismiss,
  }
})
