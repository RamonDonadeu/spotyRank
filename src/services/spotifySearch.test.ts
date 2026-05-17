import { describe, expect, it, vi } from 'vitest'
import { SpotifyApiError, type SpotifyFetch } from './spotifyApi.ts'
import {
  buildArtistTrackSearchQuery,
  clampSearchLimit,
  fetchAlbumsBatch,
  fetchAllArtistTracksAsRankTracks,
  mapSearchTrack,
  searchSpotify,
  SPOTIFY_ALBUMS_BATCH_SIZE,
} from './spotifySearch.ts'

describe('buildArtistTrackSearchQuery', () => {
  it('wraps artist name in quotes for search filter', () => {
    expect(buildArtistTrackSearchQuery('Daft Punk')).toBe('artist:"Daft Punk"')
  })
})

describe('fetchAllArtistTracksAsRankTracks', () => {
  it('loads and dedupes tracks via batch GET /albums?ids=', async () => {
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
      if (url.includes('/albums?') && url.includes('ids=alb1')) {
        expect(url).toContain('market=US')
        return Response.json({
          albums: [
            {
              id: 'alb1',
              name: 'Album 1',
              images: [],
              tracks: {
                items: [
                  {
                    id: 't1',
                    name: 'One',
                    artists: [{ id: 'a1', name: 'Artist' }],
                  },
                ],
                next: null,
              },
            },
            {
              id: 'alb2',
              name: 'Album 2',
              images: [],
              tracks: {
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
              },
            },
          ],
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
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringMatching(/\/albums\?.*ids=alb1%2Calb2/),
      expect.anything(),
    )
    expect(
      fetchImpl.mock.calls.some((call) => String(call[0]).includes('/albums/alb1/tracks')),
    ).toBe(false)
  })

  it('paginates remaining tracks when batch album embed has tracks.next', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo) => {
      const url = String(input)
      if (url.includes('/artists/a1/albums')) {
        return Response.json({
          items: [{ id: 'alb1', name: 'Big album', images: [] }],
          next: null,
          total: 1,
        })
      }
      if (url.includes('/albums?') && url.includes('ids=alb1')) {
        return Response.json({
          albums: [
            {
              id: 'alb1',
              name: 'Big album',
              images: [],
              tracks: {
                items: [
                  {
                    id: 't1',
                    name: 'One',
                    artists: [{ id: 'a1', name: 'Artist' }],
                  },
                ],
                next: 'https://api.spotify.com/v1/albums/alb1/tracks?offset=1',
              },
            },
          ],
        })
      }
      if (url.includes('/albums/alb1/tracks') && url.includes('offset=1')) {
        return Response.json({
          items: [
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

describe('fetchAlbumsBatch', () => {
  it('requests up to 20 ids per call', async () => {
    const ids = Array.from({ length: SPOTIFY_ALBUMS_BATCH_SIZE }, (_, i) => `alb${i}`)
    const fetchImpl = vi.fn(async () =>
      Response.json({
        albums: ids.map((id) => ({
          id,
          name: id,
          images: [],
          tracks: { items: [], next: null },
        })),
      }),
    )

    await fetchAlbumsBatch(ids, 'token', fetchImpl as SpotifyFetch)

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining(`ids=${ids.join('%2C')}`),
      expect.anything(),
    )
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
