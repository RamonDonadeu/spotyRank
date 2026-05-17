const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

export class SpotifyApiError extends Error {
  readonly status: number
  readonly body: string

  constructor(status: number, body: string) {
    super(parseSpotifyErrorMessage(status, body))
    this.name = 'SpotifyApiError'
    this.status = status
    this.body = body
  }
}

/** Prefer Spotify's `error.message` in UI when present. */
export function parseSpotifyErrorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } }
    const message = parsed.error?.message
    if (message) {
      if (status === 400 && message === 'Invalid limit') {
        return `${message} (Spotify allows limit 1–10 for search and artist albums)`
      }
      if (status === 403) {
        return message
      }
      return message
    }
  } catch {
    /* not JSON */
  }
  return `Spotify API error ${status}`
}

export class InsufficientScopeError extends SpotifyApiError {
  constructor(body: string) {
    super(403, body)
    this.name = 'InsufficientScopeError'
  }
}

/** True when Spotify rejected the call because the access token lacks required scopes. */
export function isInsufficientScopeResponse(status: number, body: string): boolean {
  if (status !== 403) return false
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } }
    const message = parsed.error?.message?.toLowerCase() ?? ''
    return message.includes('scope') || message.includes('permission')
  } catch {
    return false
  }
}

export type SpotifyFetch = typeof fetch

export const SPOTIFY_LIBRARY_URI_BATCH_SIZE = 40

export function toSpotifyUri(kind: 'track' | 'album' | 'artist', id: string): string {
  return `spotify:${kind}:${id}`
}

/** Save tracks, albums, etc. via PUT /me/library (replaces deprecated ?ids= on /me/tracks). */
export async function spotifyPutLibraryUris(
  uris: string[],
  accessToken: string,
  fetchImpl: SpotifyFetch = fetch,
): Promise<void> {
  if (uris.length === 0) return
  if (uris.length > SPOTIFY_LIBRARY_URI_BATCH_SIZE) {
    throw new Error(`spotifyPutLibraryUris accepts at most ${SPOTIFY_LIBRARY_URI_BATCH_SIZE} uris per call`)
  }

  const url = new URL(`${SPOTIFY_API_BASE}/me/library`)
  url.searchParams.set('uris', uris.join(','))

  const response = await fetchImpl(url.toString(), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.ok) return

  const body = await response.text()
  if (isInsufficientScopeResponse(response.status, body)) {
    throw new InsufficientScopeError(body)
  }
  throw new SpotifyApiError(response.status, body)
}

export async function spotifyPutIds(
  path: string,
  ids: string[],
  accessToken: string,
  fetchImpl: SpotifyFetch = fetch,
): Promise<void> {
  if (ids.length === 0) return
  if (ids.length > 50) {
    throw new Error('spotifyPutIds accepts at most 50 ids per call')
  }

  const url = new URL(`${SPOTIFY_API_BASE}${path}`)
  url.searchParams.set('ids', ids.join(','))

  const response = await fetchImpl(url.toString(), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.ok) return

  const body = await response.text()
  if (isInsufficientScopeResponse(response.status, body)) {
    throw new InsufficientScopeError(body)
  }
  throw new SpotifyApiError(response.status, body)
}

export {
  searchSpotify,
  fetchAlbumTracksAsRankTracks,
  fetchAllArtistTracksAsRankTracks,
  fetchArtistTopTracksAsRankTracks,
  type ArtistCatalogProgress,
  type SearchResult,
  type SpotifySearchType,
} from './spotifySearch.ts'
