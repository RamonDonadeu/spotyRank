import { chunkIds, SPOTIFY_LIBRARY_URI_BATCH_SIZE } from '../helpers/chunkIds.ts'
import type { LibrarySaveBatchResult, LibrarySaveKind, LibrarySaveResult } from './apiTypes/librarySave.ts'
import type { RankedItem } from './apiTypes/rankedItem.ts'
import {
  InsufficientScopeError,
  SpotifyApiError,
  type SpotifyFetch,
  spotifyPutIds,
  spotifyPutLibraryUris,
  toSpotifyUri,
} from './spotifyApi.ts'
import { isMockMode } from './spotifyAuth.ts'
import { mockSaveBatch } from './spotifyLibrary.mock.ts'

export type SaveProgress = {
  saved: number
  total: number
}

export type SaveToLibraryOptions = {
  accessToken: string
  onProgress?: (progress: SaveProgress) => void
  fetchImpl?: SpotifyFetch
}

const FOLLOW_ARTISTS_PATH = '/me/following?type=artist'

async function saveLibraryUriBatch(
  kind: LibrarySaveKind,
  uris: string[],
  accessToken: string,
  fetchImpl?: SpotifyFetch,
): Promise<LibrarySaveBatchResult> {
  const ids = uris.map((uri) => uri.split(':').pop() ?? uri)
  if (uris.length === 0) {
    return { kind, ids, ok: true }
  }

  if (isMockMode()) {
    return mockSaveBatch(kind, ids)
  }

  try {
    await spotifyPutLibraryUris(uris, accessToken, fetchImpl)
    return { kind, ids, ok: true }
  } catch (error) {
    if (error instanceof InsufficientScopeError) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = error instanceof SpotifyApiError ? error.status : undefined
    return { kind, ids, ok: false, status, message }
  }
}

async function saveFollowArtistBatch(
  ids: string[],
  accessToken: string,
  fetchImpl?: SpotifyFetch,
): Promise<LibrarySaveBatchResult> {
  const kind: LibrarySaveKind = 'artists'
  if (ids.length === 0) {
    return { kind, ids, ok: true }
  }

  if (isMockMode()) {
    return mockSaveBatch(kind, ids)
  }

  try {
    await spotifyPutIds(FOLLOW_ARTISTS_PATH, ids, accessToken, fetchImpl)
    return { kind, ids, ok: true }
  } catch (error) {
    if (error instanceof InsufficientScopeError) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = error instanceof SpotifyApiError ? error.status : undefined
    return { kind, ids, ok: false, status, message }
  }
}

export async function saveTracksToLibrary(
  ids: string[],
  options: SaveToLibraryOptions,
): Promise<LibrarySaveBatchResult[]> {
  return saveLibraryUrisByKind(
    'tracks',
    ids.map((id) => toSpotifyUri('track', id)),
    options,
  )
}

export async function saveAlbumsToLibrary(
  ids: string[],
  options: SaveToLibraryOptions,
): Promise<LibrarySaveBatchResult[]> {
  return saveLibraryUrisByKind(
    'albums',
    ids.map((id) => toSpotifyUri('album', id)),
    options,
  )
}

export async function followArtists(
  ids: string[],
  options: SaveToLibraryOptions,
): Promise<LibrarySaveBatchResult[]> {
  const batches: LibrarySaveBatchResult[] = []
  let saved = 0
  const total = ids.length

  for (const chunk of chunkIds(ids)) {
    const result = await saveFollowArtistBatch(chunk, options.accessToken, options.fetchImpl)
    batches.push(result)
    saved += chunk.length
    options.onProgress?.({ saved, total })
    if (!result.ok) break
  }

  return batches
}

async function saveLibraryUrisByKind(
  kind: LibrarySaveKind,
  uris: string[],
  options: SaveToLibraryOptions,
): Promise<LibrarySaveBatchResult[]> {
  const batches: LibrarySaveBatchResult[] = []
  let saved = 0
  const total = uris.length

  for (const chunk of chunkIds(uris, SPOTIFY_LIBRARY_URI_BATCH_SIZE)) {
    const result = await saveLibraryUriBatch(kind, chunk, options.accessToken, options.fetchImpl)
    batches.push(result)
    saved += chunk.length
    options.onProgress?.({ saved, total })
    if (!result.ok) break
  }

  return batches
}

/** Count savable entities for progress (one id per ranked row). */
export function countSavableItems(items: readonly RankedItem[]): number {
  return items.length
}

/**
 * Walk ranked list in order: batch consecutive tracks (40 max), flush before album/artist.
 */
export async function saveRankedToLibrary(
  items: readonly RankedItem[],
  options: SaveToLibraryOptions,
): Promise<LibrarySaveResult> {
  const batches: LibrarySaveBatchResult[] = []
  const total = countSavableItems(items)
  let saved = 0
  let trackBuffer: string[] = []

  const flushTracks = async (): Promise<boolean> => {
    if (trackBuffer.length === 0) return true
    for (const chunk of chunkIds(trackBuffer, SPOTIFY_LIBRARY_URI_BATCH_SIZE)) {
      const uris = chunk.map((id) => toSpotifyUri('track', id))
      const result = await saveLibraryUriBatch('tracks', uris, options.accessToken, options.fetchImpl)
      batches.push(result)
      saved += chunk.length
      options.onProgress?.({ saved, total })
      if (!result.ok) {
        trackBuffer = []
        return false
      }
    }
    trackBuffer = []
    return true
  }

  try {
    for (const item of items) {
      if (item.type === 'track') {
        trackBuffer.push(item.id)
        if (trackBuffer.length >= SPOTIFY_LIBRARY_URI_BATCH_SIZE) {
          const ok = await flushTracks()
          if (!ok) break
        }
        continue
      }

      const flushed = await flushTracks()
      if (!flushed) break

      if (item.type === 'album') {
        const result = await saveLibraryUriBatch(
          'albums',
          [toSpotifyUri('album', item.id)],
          options.accessToken,
          options.fetchImpl,
        )
        batches.push(result)
      } else {
        const result = await saveFollowArtistBatch([item.id], options.accessToken, options.fetchImpl)
        batches.push(result)
      }
      saved += 1
      options.onProgress?.({ saved, total })
      if (!batches[batches.length - 1]?.ok) break
    }

    if (batches.every((b) => b.ok)) {
      await flushTracks()
    }
  } catch (error) {
    if (error instanceof InsufficientScopeError) {
      throw error
    }
    throw error
  }

  const savedCount = batches.filter((b) => b.ok).reduce((sum, b) => sum + b.ids.length, 0)
  const partialFailure = batches.some((b) => !b.ok)

  return {
    savedCount,
    totalCount: total,
    batches,
    partialFailure,
  }
}

export { InsufficientScopeError }
