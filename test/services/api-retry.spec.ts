import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/services/admin.api')

const { deleteDocument, listDocuments } = await import('@/services/admin.api')

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('reading through a cold start', () => {
  it('retries a read the API answered while it was still waking up', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'Not ready' }, 503))
      .mockResolvedValueOnce(jsonResponse([{ id: 'awake' }]))

    const reading = listDocuments('projects')
    await vi.advanceTimersByTimeAsync(5_000)

    await expect(reading).resolves.toEqual([{ id: 'awake' }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('gives up rather than retrying for ever', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Not ready' }, 503))

    const reading = expect(listDocuments('projects')).rejects.toBeTruthy()
    await vi.advanceTimersByTimeAsync(20_000)
    await reading

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('leaves a genuine failure alone', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Nope' }, 404))

    const reading = expect(listDocuments('projects')).rejects.toBeTruthy()
    await vi.advanceTimersByTimeAsync(20_000)
    await reading

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never repeats a write', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Not ready' }, 503))

    const writing = expect(deleteDocument('projects', 'p1')).rejects.toBeTruthy()
    await vi.advanceTimersByTimeAsync(20_000)
    await writing

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
