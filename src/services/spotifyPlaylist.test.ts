import { describe, expect, it, vi } from 'vitest'
import type { RankedItem } from './apiTypes/rankedItem.ts'
import { saveRankedAsPlaylist } from './spotifyPlaylist.ts'

function track(id: string): RankedItem {
  return { id, type: 'track', name: id }
}

describe('saveRankedAsPlaylist', () => {
  it('creates a playlist and adds tracks in rank order', async () => {
    const calls: string[] = []
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      calls.push(`${init?.method ?? 'GET'} ${url}`)
      if (url.includes('/items') && init?.body) {
        const parsed = JSON.parse(String(init.body)) as { uris: string[] }
        expect(parsed.uris.length).toBeGreaterThan(0)
      }
      if (url.endsWith('/me/playlists')) {
        return new Response(
          JSON.stringify({
            id: 'pl-1',
            name: 'My rank',
            external_urls: { spotify: 'https://open.spotify.com/playlist/pl-1' },
          }),
          { status: 201 },
        )
      }
      return new Response(null, { status: 201 })
    })

    const result = await saveRankedAsPlaylist(
      [track('a'), track('b')],
      'My rank',
      { accessToken: 'token', fetchImpl: fetchImpl as typeof fetch },
    )

    expect(result.partialFailure).toBe(false)
    expect(result.savedCount).toBe(2)
    expect(result.playlistUrl).toContain('playlist/pl-1')
    expect(calls[0]).toContain('POST')
    expect(calls[0]).toContain('/me/playlists')
    expect(calls[1]).toContain('/playlists/pl-1/items')
    const addBody = JSON.parse(
      String(
        (fetchImpl.mock.calls.find((call) =>
          String(call[0]).includes('/items'),
        )?.[1] as RequestInit | undefined)?.body,
      ),
    ) as { uris: string[] }
    expect(addBody.uris).toEqual(['spotify:track:a', 'spotify:track:b'])
  })

  it('chunks more than 100 tracks', async () => {
    let addCallCount = 0
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/me/playlists')) {
        return new Response(JSON.stringify({ id: 'pl-2', name: 'Big' }), { status: 201 })
      }
      addCallCount += 1
      return new Response(null, { status: 201 })
    })

    const items = Array.from({ length: 150 }, (_, i) => track(`t${i}`))
    const result = await saveRankedAsPlaylist(items, 'Big', {
      accessToken: 'token',
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(addCallCount).toBe(2)
    expect(result.savedCount).toBe(150)
  })
})
