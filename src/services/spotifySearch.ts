import type { Track } from '../helpers/ranking/types.ts'
import type {
  SpotifyAlbumTracksPage,
  SpotifyArtistAlbumSummary,
  SpotifyArtistAlbumsPage,
  SpotifySearchAlbum,
  SpotifySearchArtist,
  SpotifySearchResponse,
  SpotifySearchTrack,
  SpotifySearchTracksPage,
} from './apiTypes/spotifySearch.ts'
import { SpotifyApiError, type SpotifyFetch } from './spotifyApi.ts'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

export type SpotifySearchType = 'track' | 'album' | 'artist'

export type SearchResult = {
  id: string
  type: SpotifySearchType
  name: string
  subtitle: string
  imageUrl?: string
  albumId?: string
  albumName?: string
}

/** Default market for artist top-tracks (Spotify requires a market code). */
export const ARTIST_TOP_TRACKS_MARKET = 'US'

/**
 * Max page size for search and artist-albums endpoints (Spotify Web API: limit 1–10).
 * Album tracks pagination still allows up to 50 — see {@link SPOTIFY_ALBUM_TRACKS_PAGE_SIZE}.
 */
export const SPOTIFY_SEARCH_LIMIT_MAX = 10

const SPOTIFY_ALBUM_TRACKS_PAGE_SIZE = 50

export function clampSearchLimit(limit: number): number {
  if (!Number.isFinite(limit)) return SPOTIFY_SEARCH_LIMIT_MAX
  return Math.min(SPOTIFY_SEARCH_LIMIT_MAX, Math.max(1, Math.floor(limit)))
}

/** Spotify search filter: https://developer.spotify.com/documentation/web-api/reference/search */
export function buildArtistTrackSearchQuery(artistName: string): string {
  const sanitized = artistName.trim().replace(/"/g, '')
  return `artist:"${sanitized}"`
}

function trackIncludesArtist(item: SpotifySearchTrack, artistId: string): boolean {
  return item.artists.some((a) => a.id === artistId)
}

export type ArtistCatalogProgress = {
  albumsLoaded: number
  albumTotal: number
  tracksCollected: number
}

const ARTIST_ALBUM_GROUPS = 'album,single,compilation'
const ARTIST_ALBUMS_PAGE_SIZE = SPOTIFY_SEARCH_LIMIT_MAX
/** Spotify search offset cannot exceed 1000. */
const SEARCH_TRACKS_OFFSET_MAX = 1000

function mergeTracksUnique(into: Map<string, Track>, tracks: Track[]): void {
  for (const track of tracks) {
    if (!into.has(track.id)) {
      into.set(track.id, track)
    }
  }
}

function pickImageUrl(images: { url: string }[] | undefined): string | undefined {
  return images?.[0]?.url
}

function formatArtists(artists: { name: string }[]): string {
  return artists.map((a) => a.name).join(', ')
}

export function mapSearchTrack(item: SpotifySearchTrack): SearchResult {
  return {
    id: item.id,
    type: 'track',
    name: item.name,
    subtitle: formatArtists(item.artists),
    imageUrl: pickImageUrl(item.album.images),
    albumId: item.album.id,
    albumName: item.album.name,
  }
}

export function mapSearchAlbum(item: SpotifySearchAlbum): SearchResult {
  return {
    id: item.id,
    type: 'album',
    name: item.name,
    subtitle: formatArtists(item.artists),
    imageUrl: pickImageUrl(item.images),
  }
}

export function mapSearchArtist(item: SpotifySearchArtist): SearchResult {
  return {
    id: item.id,
    type: 'artist',
    name: item.name,
    subtitle: '',
    imageUrl: pickImageUrl(item.images),
  }
}

export function mapApiTrackToRankTrack(item: SpotifySearchTrack): Track {
  return {
    id: item.id,
    name: item.name,
    artist: formatArtists(item.artists),
    imageUrl: pickImageUrl(item.album.images),
    albumId: item.album.id,
    albumName: item.album.name,
  }
}

export function mapAlbumTrackToRankTrack(
  item: SpotifyAlbumTracksPage['items'][number],
  album?: { id: string; name: string; imageUrl?: string },
): Track {
  return {
    id: item.id,
    name: item.name,
    artist: formatArtists(item.artists),
    imageUrl: album?.imageUrl,
    albumId: album?.id,
    albumName: album?.name,
  }
}

async function spotifyGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
  fetchImpl: SpotifyFetch = fetch,
): Promise<T> {
  const url = new URL(`${SPOTIFY_API_BASE}${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetchImpl(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (response.ok) {
    return (await response.json()) as T
  }

  const body = await response.text()
  throw new SpotifyApiError(response.status, body)
}

export async function searchSpotify(
  query: string,
  type: SpotifySearchType,
  limit: number,
  accessToken: string,
  fetchImpl?: SpotifyFetch,
): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const data = await spotifyGet<SpotifySearchResponse>(
    '/search',
    accessToken,
    { q: trimmed, type, limit: String(clampSearchLimit(limit)) },
    fetchImpl,
  )

  switch (type) {
    case 'track':
      return (data.tracks?.items ?? []).filter(Boolean).map(mapSearchTrack)
    case 'album':
      return (data.albums?.items ?? []).filter(Boolean).map(mapSearchAlbum)
    case 'artist':
      return (data.artists?.items ?? []).filter(Boolean).map(mapSearchArtist)
  }
}

/** Fetches all album tracks (paginated) and maps them to ranking tracks. */
export async function fetchAlbumTracksAsRankTracks(
  albumId: string,
  accessToken: string,
  fetchImpl?: SpotifyFetch,
  albumMeta?: { name: string; imageUrl?: string },
): Promise<Track[]> {
  const tracks: Track[] = []
  let offset = 0
  const albumRef = {
    id: albumId,
    name: albumMeta?.name ?? '',
    imageUrl: albumMeta?.imageUrl,
  }
  for (;;) {
    const page = await spotifyGet<SpotifyAlbumTracksPage>(
      `/albums/${albumId}/tracks`,
      accessToken,
      {
        limit: String(SPOTIFY_ALBUM_TRACKS_PAGE_SIZE),
        offset: String(offset),
      },
      fetchImpl,
    )
    for (const item of page.items) {
      tracks.push(mapAlbumTrackToRankTrack(item, albumRef))
    }
    if (!page.next) break
    offset += SPOTIFY_ALBUM_TRACKS_PAGE_SIZE
  }

  return tracks
}

/** Paginates GET /artists/{id}/albums for album, single, and compilation releases. */
export async function fetchAllArtistAlbums(
  artistId: string,
  accessToken: string,
  fetchImpl?: SpotifyFetch,
): Promise<SpotifyArtistAlbumSummary[]> {
  const albums: SpotifyArtistAlbumSummary[] = []
  let offset = 0

  for (;;) {
    const page = await spotifyGet<SpotifyArtistAlbumsPage>(
      `/artists/${artistId}/albums`,
      accessToken,
      {
        include_groups: ARTIST_ALBUM_GROUPS,
        market: ARTIST_TOP_TRACKS_MARKET,
        limit: String(clampSearchLimit(ARTIST_ALBUMS_PAGE_SIZE)),
        offset: String(offset),
      },
      fetchImpl,
    )

    albums.push(...page.items.filter(Boolean))
    if (!page.next) break
    offset += ARTIST_ALBUMS_PAGE_SIZE
  }

  return albums
}

/**
 * Paginates track search with artist filter (fallback when album catalog is blocked).
 * Stops at Spotify's search offset cap (~1000 results).
 */
export async function searchAllTracksByArtistPaginated(
  artistId: string,
  artistName: string,
  accessToken: string,
  fetchImpl?: SpotifyFetch,
  onProgress?: (tracksCollected: number) => void,
): Promise<Track[]> {
  const byId = new Map<string, Track>()
  let offset = 0

  while (offset <= SEARCH_TRACKS_OFFSET_MAX) {
    const data = await spotifyGet<SpotifySearchResponse>(
      '/search',
      accessToken,
      {
        q: buildArtistTrackSearchQuery(artistName),
        type: 'track',
        limit: String(SPOTIFY_SEARCH_LIMIT_MAX),
        offset: String(offset),
      },
      fetchImpl,
    )

    const page = data.tracks as SpotifySearchTracksPage | undefined
    const items = (page?.items ?? []).filter(Boolean)
    if (items.length === 0) break

    const matching = items.filter((item) => trackIncludesArtist(item, artistId))
    const toAdd = (matching.length > 0 ? matching : items).map(mapApiTrackToRankTrack)
    mergeTracksUnique(byId, toAdd)
    onProgress?.(byId.size)

    if (!page?.next) break
    offset += SPOTIFY_SEARCH_LIMIT_MAX
  }

  return [...byId.values()]
}

/**
 * Loads every track from an artist's albums/singles/compilations (deduped by track id).
 * Falls back to paginated search if the albums catalog endpoint is blocked (403).
 */
export async function fetchAllArtistTracksAsRankTracks(
  artistId: string,
  artistName: string,
  accessToken: string,
  fetchImpl?: SpotifyFetch,
  onProgress?: (progress: ArtistCatalogProgress) => void,
): Promise<Track[]> {
  const name = artistName.trim()
  if (!name) {
    throw new SpotifyApiError(400, '{"error":{"message":"Artist name required"}}')
  }

  const byId = new Map<string, Track>()

  try {
    const albums = await fetchAllArtistAlbums(artistId, accessToken, fetchImpl)
    const albumTotal = albums.length

    for (let i = 0; i < albums.length; i++) {
      const album = albums[i]!
      onProgress?.({
        albumsLoaded: i + 1,
        albumTotal,
        tracksCollected: byId.size,
      })

      try {
        const albumTracks = await fetchAlbumTracksAsRankTracks(
          album.id,
          accessToken,
          fetchImpl,
          { name: album.name, imageUrl: pickImageUrl(album.images) },
        )
        mergeTracksUnique(byId, albumTracks)
      } catch (err) {
        if (err instanceof SpotifyApiError && (err.status === 403 || err.status === 404)) {
          if (import.meta.env.DEV) {
            console.debug('[spotifySearch] skipping album tracks', album.id, err.status)
          }
          continue
        }
        throw err
      }
    }

    if (byId.size > 0) {
      return [...byId.values()]
    }
  } catch (err) {
    if (!(err instanceof SpotifyApiError && (err.status === 403 || err.status === 404))) {
      throw err
    }
    if (import.meta.env.DEV) {
      console.debug('[spotifySearch] artist albums blocked; falling back to search', {
        artistId,
        status: err.status,
      })
    }
  }

  return searchAllTracksByArtistPaginated(
    artistId,
    name,
    accessToken,
    fetchImpl,
    (tracksCollected) => {
      onProgress?.({ albumsLoaded: 0, albumTotal: 0, tracksCollected })
    },
  )
}

/** @deprecated Use {@link fetchAllArtistTracksAsRankTracks} */
export async function fetchArtistTopTracksAsRankTracks(
  artistId: string,
  accessToken: string,
  fetchImpl?: SpotifyFetch,
  artistName?: string,
): Promise<Track[]> {
  return fetchAllArtistTracksAsRankTracks(
    artistId,
    artistName ?? '',
    accessToken,
    fetchImpl,
  )
}
