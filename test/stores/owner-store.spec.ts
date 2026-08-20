import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as api from '@/services/admin.api'
import { useOwnerStore } from '@/stores/owner'
import { assetPrefix } from '@/utils/assets'
import type { OwnerRecord } from '@/types/admin'

const record = {
  id: 'o1',
  slug: 'ada-lovelace',
  status: 'published',
  assetPrefix: 'owner-folder',
  consentMode: 'measurement',
} as unknown as OwnerRecord

describe('reading the account once', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('makes a second caller wait for the read already under way', async () => {
    let release: (value: OwnerRecord) => void = () => {}
    vi.mocked(api.fetchMe).mockReturnValueOnce(
      new Promise<OwnerRecord>((resolve) => {
        release = resolve
      }),
    )

    const owner = useOwnerStore()
    const first = owner.load()

    let seen: unknown = 'still waiting'
    const second = owner.load().then(() => {
      seen = owner.record
    })

    for (let i = 0; i < 5; i += 1) await Promise.resolve()
    expect(seen).toBe('still waiting')

    release(record)
    await Promise.all([first, second])

    expect(seen).toEqual(record)
    expect(assetPrefix()).toBe('owner-folder')
    expect(api.fetchMe).toHaveBeenCalledTimes(1)
  })

  it('does not read again once the account is known', async () => {
    vi.mocked(api.fetchMe).mockResolvedValueOnce(record)

    const owner = useOwnerStore()
    await owner.load()
    await owner.load()

    expect(api.fetchMe).toHaveBeenCalledTimes(1)
  })

  it('reads again when asked to', async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(record)

    const owner = useOwnerStore()
    await owner.load()
    await owner.load(true)

    expect(api.fetchMe).toHaveBeenCalledTimes(2)
  })
})
