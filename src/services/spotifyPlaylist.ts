import { chunkIds } from '../helpers/chunkIds.ts'
import { extractTrackIdsInOrder } from './apiTypes/rankedItem.ts'
import type { PlaylistSaveResult } from './apiTypes/playlistSave.ts'
import type { RankedItem } from './apiTypes/rankedItem.ts'
import {
  InsufficientScopeError,
  SpotifyApiError,
  type SpotifyFetch,
  isInsufficientScopeResponse,
  toSpotifyUri,
} from './spotifyApi.ts'
import { isMockMode } from './spotifyAuth.ts'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
const PLAYLIST_TRACK_BATCH_SIZE = 100

export type SavePlaylistProgress = {
  saved: number
  total: number
}

export type SavePlaylistOptions = {
  accessToken: string
  onProgress?: (progress: SavePlaylistProgress) => void
  fetchImpl?: SpotifyFetch
}

type CreatePlaylistResponse = {
  id: string
  name: string
  external_urls?: { spotify?: string }
}

async function parseApiError(response: Response): Promise<never> {
  const body = await response.text()
  if (isInsufficientScopeResponse(response.status, body)) {
    throw new InsufficientScopeError(body)
  }
  throw new SpotifyApiError(response.status, body)
}

export async function createUserPlaylist(
  name: string,
  accessToken: string,
  fetchImpl: SpotifyFetch = fetch,
): Promise<CreatePlaylistResponse> {
  const response = await fetchImpl(`${SPOTIFY_API_BASE}/me/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description: 'Created with spotyrank.radoca.xyz',
      public: false,
    }),
  })

  if (!response.ok) {
    await parseApiError(response)
  }

  return (await response.json()) as CreatePlaylistResponse
}

/** Add tracks in rank order via POST /playlists/{id}/items (JSON body; /tracks is deprecated). */
export async function addItemsToPlaylist(
  playlistId: string,
  uris: string[],
  accessToken: string,
  fetchImpl: SpotifyFetch = fetch,
  position?: number,
): Promise<void> {
  if (uris.length === 0) return
  if (uris.length > PLAYLIST_TRACK_BATCH_SIZE) {
    throw new Error(`addItemsToPlaylist accepts at most ${PLAYLIST_TRACK_BATCH_SIZE} uris per call`)
  }

  const body: { uris: string[]; position?: number } = { uris }
  if (position !== undefined) {
    body.position = position
  }

  const response = await fetchImpl(`${SPOTIFY_API_BASE}/playlists/${playlistId}/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    await parseApiError(response)
  }
}

export async function saveRankedAsPlaylist(
  items: readonly RankedItem[],
  playlistName: string,
  options: SavePlaylistOptions,
): Promise<PlaylistSaveResult> {
  const name = playlistName.trim()
  if (!name) {
    throw new Error('Playlist name is required')
  }

  const trackIds = extractTrackIdsInOrder(items)
  const total = trackIds.length
  if (total === 0) {
    throw new Error('No tracks to save')
  }

  if (isMockMode()) {
    options.onProgress?.({ saved: total, total })
    return {
      playlistId: 'mock-playlist',
      playlistName: name,
      playlistUrl: undefined,
      savedCount: total,
      totalCount: total,
      partialFailure: false,
    }
  }

  const playlist = await createUserPlaylist(name, options.accessToken, options.fetchImpl)
  let saved = 0
  let insertPosition = 0

  for (const chunk of chunkIds(trackIds, PLAYLIST_TRACK_BATCH_SIZE)) {
    const uris = chunk.map((id) => toSpotifyUri('track', id))
    await addItemsToPlaylist(
      playlist.id,
      uris,
      options.accessToken,
      options.fetchImpl,
      insertPosition,
    )
    saved += chunk.length
    insertPosition += chunk.length
    options.onProgress?.({ saved, total })
  }

  return {
    playlistId: playlist.id,
    playlistName: playlist.name,
    playlistUrl: playlist.external_urls?.spotify,
    savedCount: saved,
    totalCount: total,
    partialFailure: false,
  }
}

export { InsufficientScopeError }
