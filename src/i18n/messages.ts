import en from '@/locales/en.json' with { type: 'json' }
import fr from '@/locales/fr.json' with { type: 'json' }

export type Messages = typeof en

export const DEFAULT_LANG = 'en'

export const messages: Record<string, Messages> = { en, fr }

export const UI_LANGS = Object.keys(messages).sort()

export function uiLangFor(lang: string): string {
  const short = lang.split('-')[0]
  if (lang in messages) return lang
  if (short in messages) return short
  return DEFAULT_LANG
}

export function messagesFor(lang: string): Messages {
  return messages[uiLangFor(lang)]
}
