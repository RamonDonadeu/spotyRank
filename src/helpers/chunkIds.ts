/** PUT /me/library accepts at most 40 Spotify URIs per request. */
export const SPOTIFY_LIBRARY_URI_BATCH_SIZE = 40

/** Follow endpoints accept at most 50 IDs per request. */
export const SPOTIFY_ID_BATCH_SIZE = 50

export function chunkIds<T>(ids: readonly T[], size = SPOTIFY_ID_BATCH_SIZE): T[][] {
  if (size < 1) {
    throw new Error('chunk size must be at least 1')
  }
  const chunks: T[][] = []
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size))
  }
  return chunks
}
