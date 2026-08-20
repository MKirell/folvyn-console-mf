import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/services/admin.api')

const {
  ApiError,
  createDocument,
  deleteDocument,
  fetchHealth,
  listDocuments,
  presignUpload,
  putToBucket,
  reorderDocuments,
  setTokenProvider,
  setUnauthorizedHandler,
  updateDocument,
} = await import('@/services/admin.api')

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve(jsonResponse([])))
  vi.stubGlobal('fetch', fetchMock)
  setTokenProvider(() => Promise.resolve('token-1'))
  setUnauthorizedHandler(() => Promise.resolve(false))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('admin api', () => {
  it('sends the bearer token on admin reads', async () => {
    await listDocuments('admin/certifications')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:3000/api/v1/admin/certifications')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1')
  })

  it('omits the token on the public health probe', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }))
    await fetchHealth()

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('serialises a create as JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'c9' }))
    await createDocument('admin/certifications', { title: 'AI-900' })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"title":"AI-900"}')
  })

  it('patches a single document by id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'c1' }))
    await updateDocument('admin/certifications', 'c1', { title: 'x' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/certifications/c1')
    expect(init.method).toBe('PATCH')
  })

  it('posts reorder entries to the dedicated route', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await reorderDocuments('admin/awards', [{ id: 'a1', order: 0 }])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/awards/reorder')
    expect(init.body).toBe('{"entries":[{"id":"a1","order":0}]}')
  })

  it('treats 204 as an empty success', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 } as Response)
    await expect(deleteDocument('admin/awards', 'a1')).resolves.toBeUndefined()
  })

  it('surfaces class-validator messages as an ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 400,
          error: 'BadRequest',
          message: ['title should not be empty', 'icon must be a string'],
        },
        400,
      ),
    )

    await expect(createDocument('admin/certifications', {})).rejects.toMatchObject({
      status: 400,
      messages: ['title should not be empty', 'icon must be a string'],
    })
  })

  it('marks 400 and 422 as validation failures', () => {
    expect(new ApiError('bad', 400).isValidation).toBe(true)
    expect(new ApiError('bad', 422).isValidation).toBe(true)
    expect(new ApiError('bad', 500).isValidation).toBe(false)
  })

  it('retries once after a refresh recovers a 401', async () => {
    setUnauthorizedHandler(() => Promise.resolve(true))
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ statusCode: 401, message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse([{ id: 'c1' }]))

    await expect(listDocuments('admin/certifications')).resolves.toEqual([{ id: 'c1' }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('gives up when the refresh fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 401, message: 'expired' }, 401))

    await expect(listDocuments('admin/certifications')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports a network failure as a zero-status ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(fetchHealth()).rejects.toMatchObject({ status: 0 })
  })

  it('puts bytes straight to the bucket with the file content type', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response)
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' })

    await putToBucket('https://bucket.example/put', file)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://bucket.example/put')
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/pdf')
  })

  it('raises when the bucket rejects the upload', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 } as Response)
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' })

    await expect(putToBucket('https://bucket.example/put', file)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('asks the service to presign an upload', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ url: 'https://s3', key: 'a.pdf', expiresIn: 300 }))

    await expect(
      presignUpload({ filename: 'a.pdf', contentType: 'application/pdf', size: 1024 }),
    ).resolves.toMatchObject({ key: 'a.pdf' })

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/admin/uploads/presign')
  })
})
