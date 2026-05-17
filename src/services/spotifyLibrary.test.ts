import { describe, expect, it, vi } from 'vitest'
import type { RankedItem } from './apiTypes/rankedItem.ts'
import { countSavableItems, saveRankedToLibrary } from './spotifyLibrary.ts'

function track(id: string): RankedItem {
  return { id, type: 'track', name: id }
}

function libraryUriCount(url: URL): number {
  const uris = url.searchParams.get('uris')
  return uris ? uris.split(',').length : 0
}

describe('saveRankedToLibrary', () => {
  it('chunks track-only saves into batches of 40 via /me/library', async () => {
    const batchSizes: number[] = []
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }))

    const items = Array.from({ length: 75 }, (_, i) => track(`t${i}`))

    await saveRankedToLibrary(items, {
      accessToken: 'test-token',
      fetchImpl: ((input: RequestInfo | URL) => {
        const url = new URL(typeof input === 'string' ? input : input.toString())
        expect(url.pathname).toBe('/v1/me/library')
        batchSizes.push(libraryUriCount(url))
        return fetchImpl()
      }) as typeof fetch,
    })

    expect(batchSizes).toEqual([40, 35])
  })

  it('flushes track buffer before album save', async () => {
    const paths: string[] = []
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input.toString())
      paths.push(url.pathname + url.search)
      return new Response(null, { status: 200 })
    })

    const items: RankedItem[] = [
      track('t1'),
      { id: 'alb1', type: 'album', name: 'Album' },
    ]

    await saveRankedToLibrary(items, {
      accessToken: 'test-token',
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(paths[0]).toContain('/me/library')
    expect(paths[0]).toContain('spotify%3Atrack%3At1')
    expect(paths[1]).toContain('/me/library')
    expect(paths[1]).toContain('spotify%3Aalbum%3Aalb1')
  })

  it('maps scope-related 403 to InsufficientScopeError', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { status: 403, message: 'Insufficient client scope' } }),
          { status: 403 },
        ),
    )

    await expect(
      saveRankedToLibrary([track('t1')], {
        accessToken: 'test-token',
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).rejects.toMatchObject({ name: 'InsufficientScopeError' })
  })

  it('returns partial failure for other 403 responses', async () => {
    const fetchImpl = vi.fn(async () => new Response('Forbidden', { status: 403 }))

    const result = await saveRankedToLibrary([track('t1')], {
      accessToken: 'test-token',
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(result.partialFailure).toBe(true)
    expect(result.savedCount).toBe(0)
  })
})

describe('countSavableItems', () => {
  it('counts one per ranked row', () => {
    expect(countSavableItems([track('a'), track('b')])).toBe(2)
  })
})
