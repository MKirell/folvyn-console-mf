import { describe, expect, it } from 'vitest'
import { DEFAULT_LANG, UI_LANGS, messages, messagesFor, uiLangFor } from '@/i18n/messages'

function paths(value: unknown, prefix = ''): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
      paths(nested, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

describe('console ui languages', () => {
  it('ships the interface languages it has been translated into', () => {
    expect(UI_LANGS).toEqual(['en', 'fr'])
  })

  it('serves the interface in a language it knows', () => {
    expect(uiLangFor('fr')).toBe('fr')
    expect(messagesFor('fr').common.save).toBe('Enregistrer')
    expect(messagesFor('fr').nav.signOut).toBe('Se déconnecter')
  })

  it('falls back to English for a content locale it has no interface for', () => {
    expect(uiLangFor('zh')).toBe(DEFAULT_LANG)
    expect(messagesFor('zh')).toBe(messages.en)
    expect(messagesFor('ar').common.save).toBe('Save')
  })

  it('matches a regional content locale to its base interface language', () => {
    expect(uiLangFor('fr-CA')).toBe('fr')
    expect(uiLangFor('en-GB')).toBe('en')
  })

  it('falls back to English for a language not yet translated', () => {
    expect(uiLangFor('de')).toBe(DEFAULT_LANG)
    expect(uiLangFor('es')).toBe(DEFAULT_LANG)
    expect(uiLangFor('pt')).toBe(DEFAULT_LANG)
  })

  it('gives every language the same keys as English', () => {
    const english = paths(messages.en).sort()

    for (const code of UI_LANGS) {
      expect({ code, keys: paths(messages[code]).sort() }).toEqual({ code, keys: english })
    }
  })

  it('keeps every placeholder that English declares', () => {
    const placeholders = (value: string): string[] => (value.match(/\{\w+\}/g) ?? []).slice().sort()

    const walk = (english: unknown, other: unknown, trail: string): void => {
      if (typeof english === 'string' && typeof other === 'string') {
        expect({ trail, tokens: placeholders(other) }).toEqual({
          trail,
          tokens: placeholders(english),
        })
        return
      }
      if (english && typeof english === 'object' && other && typeof other === 'object') {
        for (const [key, nested] of Object.entries(english as Record<string, unknown>)) {
          walk(nested, (other as Record<string, unknown>)[key], `${trail}.${key}`)
        }
      }
    }

    for (const code of UI_LANGS) walk(messages.en, messages[code], code)
  })
})
