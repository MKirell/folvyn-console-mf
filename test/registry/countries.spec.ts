import { describe, expect, it } from 'vitest'
import { ISO_3166_1_ALPHA_2 } from '@/registry/countries'

const OFFICIALLY_ASSIGNED = 249

describe('country codes', () => {
  it('carries every officially assigned ISO 3166-1 alpha-2 code', () => {
    expect(ISO_3166_1_ALPHA_2).toHaveLength(OFFICIALLY_ASSIGNED)
  })

  it('lists each code once', () => {
    expect(new Set(ISO_3166_1_ALPHA_2).size).toBe(ISO_3166_1_ALPHA_2.length)
  })

  it('uses only well-formed codes', () => {
    for (const code of ISO_3166_1_ALPHA_2) expect(code).toMatch(/^[A-Z]{2}$/)
  })

  it('resolves every code to a real country name', () => {
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    const unresolved = ISO_3166_1_ALPHA_2.filter((code) => names.of(code) === code)

    expect(unresolved).toEqual([])
  })

  it('covers the places a hand-written list would have missed', () => {
    for (const code of ['KE', 'HR', 'BD', 'PY', 'UZ', 'FJ', 'MW']) {
      expect(ISO_3166_1_ALPHA_2).toContain(code)
    }
  })

  it('is sorted for review, not for display', () => {
    expect([...ISO_3166_1_ALPHA_2].sort()).toEqual([...ISO_3166_1_ALPHA_2])
  })
})
