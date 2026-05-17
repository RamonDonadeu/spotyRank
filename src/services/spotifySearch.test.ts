import { describe, expect, it, vi } from 'vitest'
import { SpotifyApiError, type SpotifyFetch } from './spotifyApi.ts'
import {
  buildArtistTrackSearchQuery,
  clampSearchLimit,
  fetchAllArtistTracksAsRankTracks,
  mapSearchTrack,
  searchSpotify,
} from './spotifySearch.ts'

describe('buildArtistTrackSearchQuery', () => {
  it('wraps artist name in quotes for search filter', () => {
    expect(buildArtistTrackSearchQuery('Daft Punk')).toBe('artist:"Daft Punk"')
  })
})

describe('fetchAllArtistTracksAsRankTracks', () => {
  it('loads and dedupes tracks from all artist albums', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo) => {
      const url = String(input)
      if (url.includes('/artists/a1/albums')) {
        expect(url).toContain('limit=10')
        return Response.json({
          items: [
            { id: 'alb1', name: 'Album 1', images: [] },
            { id: 'alb2', name: 'Album 2', images: [] },
          ],
          next: null,
          total: 2,
        })
      }
      if (url.includes('/albums/alb1/tracks')) {
        return Response.json({
          items: [
            {
              id: 't1',
              name: 'One',
              artists: [{ id: 'a1', name: 'Artist' }],
            },
          ],
          next: null,
        })
      }
      if (url.includes('/albums/alb2/tracks')) {
        return Response.json({
          items: [
            {
              id: 't1',
              name: 'One duplicate',
              artists: [{ id: 'a1', name: 'Artist' }],
            },
            {
              id: 't2',
              name: 'Two',
              artists: [{ id: 'a1', name: 'Artist' }],
            },
          ],
          next: null,
        })
      }
      return new Response('Not found', { status: 404 })
    })

    const tracks = await fetchAllArtistTracksAsRankTracks(
      'a1',
      'Artist',
      'token',
      fetchImpl as SpotifyFetch,
    )

    expect(tracks).toHaveLength(2)
    expect(tracks.map((t) => t.id).sort()).toEqual(['t1', 't2'])
  })

  it('falls back to paginated search when artist albums returns 403', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo) => {
      const url = String(input)
      if (url.includes('/artists/a1/albums')) {
        return new Response('Forbidden', { status: 403 })
      }
      if (url.includes('/search?')) {
        return Response.json({
          tracks: {
            items: [
              {
                id: 't9',
                name: 'Search hit',
                artists: [{ id: 'a1', name: 'Artist' }],
                album: { id: 'alb', name: 'Alb', images: [] },
              },
            ],
            next: null,
            total: 1,
          },
        })
      }
      return new Response('Not found', { status: 404 })
    })

    const tracks = await fetchAllArtistTracksAsRankTracks(
      'a1',
      'Artist',
      'token',
      fetchImpl as SpotifyFetch,
    )

    expect(tracks).toHaveLength(1)
    expect(tracks[0]?.name).toBe('Search hit')
  })

  it('requires artist name', async () => {
    await expect(
      fetchAllArtistTracksAsRankTracks('a1', '   ', 'token'),
    ).rejects.toBeInstanceOf(SpotifyApiError)
  })
})

describe('clampSearchLimit', () => {
  it('clamps to Spotify search max of 10', () => {
    expect(clampSearchLimit(20)).toBe(10)
    expect(clampSearchLimit(50)).toBe(10)
  })

  it('enforces minimum of 1', () => {
    expect(clampSearchLimit(0)).toBe(1)
    expect(clampSearchLimit(-5)).toBe(1)
  })
})

describe('searchSpotify', () => {
  it('maps track search results', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        tracks: {
          items: [
            {
              id: 't1',
              name: 'Song',
              artists: [{ id: 'a1', name: 'Artist' }],
              album: {
                id: 'alb1',
                name: 'Album',
                images: [{ url: 'https://img.example/1.jpg', height: 64, width: 64 }],
              },
            },
          ],
        },
      }),
    )

    const results = await searchSpotify('song', 'track', 10, 'token', fetchImpl as SpotifyFetch)

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringMatching(/\/search\?.*limit=10/),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    )
    expect(results).toEqual([
      {
        id: 't1',
        type: 'track',
        name: 'Song',
        subtitle: 'Artist',
        imageUrl: 'https://img.example/1.jpg',
        albumId: 'alb1',
        albumName: 'Album',
      },
    ])
  })

  it('clamps limit above 10 in the request URL', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ tracks: { items: [] } }),
    )
    await searchSpotify('ab', 'track', 20, 'token', fetchImpl as SpotifyFetch)
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.anything(),
    )
  })

  it('returns empty array for blank query', async () => {
    const fetchImpl = vi.fn()
    const results = await searchSpotify('   ', 'track', 10, 'token', fetchImpl)
    expect(results).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('mapSearchTrack', () => {
  it('joins multiple artists', () => {
    const result = mapSearchTrack({
      id: 't1',
      name: 'Song',
      artists: [
        { id: 'a1', name: 'One' },
        { id: 'a2', name: 'Two' },
      ],
      album: { id: 'alb', name: 'Alb', images: [] },
    })
    expect(result.subtitle).toBe('One, Two')
  })
})
