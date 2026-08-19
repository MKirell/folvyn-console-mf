import { createI18n } from 'vue-i18n'
import { watch } from 'vue'
import { DEFAULT_LANG, messages, uiLangFor } from '@/i18n/messages'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: DEFAULT_LANG,
  fallbackLocale: DEFAULT_LANG,
  missingWarn: false,
  fallbackWarn: false,
  messages,
})

export function setUiLang(lang: string): void {
  i18n.global.locale.value = uiLangFor(lang)
}

function requestedLang(): string {
  try {
    return new URLSearchParams(window.location.search).get('lang') ?? ''
  } catch {
    return ''
  }
}

export function syncUiLang(): void {
  const ui = useUiStore()
  const content = useContentStore()

  watch(
    () => requestedLang() || ui.editingLang || content.referenceLang,
    (lang) => {
      if (lang) setUiLang(lang)
    },
    { immediate: true },
  )
}

export { DEFAULT_LANG, UI_LANGS, messages, messagesFor, uiLangFor } from '@/i18n/messages'
export type { Messages } from '@/i18n/messages'
