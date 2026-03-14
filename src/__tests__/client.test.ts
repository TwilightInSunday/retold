import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, del, get, patch, post, put } from '../api/client'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('API client', () => {
  it('GET returns parsed JSON', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: '1' }))
    const result = await get('/api/test')
    expect(result).toEqual({ id: '1' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('POST sends body and returns JSON', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: '2' }))
    const result = await post('/api/test', { name: 'foo' })
    expect(result).toEqual({ id: '2' })
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.method).toBe('POST')
    expect(opts.body).toBe(JSON.stringify({ name: 'foo' }))
  })

  it('PUT sends body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: '3' }))
    const result = await put('/api/test/3', { name: 'bar' })
    expect(result).toEqual({ id: '3' })
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT')
  })

  it('PATCH sends body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: '4' }))
    const result = await patch('/api/test/4', { text: 'baz' })
    expect(result).toEqual({ id: '4' })
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
  })

  it('DELETE works', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }))
    const result = await del('/api/test/5')
    expect(result).toBeUndefined()
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
  })

  it('throws ApiError on non-ok response', async () => {
    mockFetch.mockResolvedValue(new Response('Not found', { status: 404, statusText: 'Not Found' }))
    await expect(get('/api/missing')).rejects.toThrow(ApiError)
    await expect(get('/api/missing')).rejects.toThrow('404')
  })
})
