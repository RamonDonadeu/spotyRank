import type { SpotifyUserProfile } from './apiTypes/spotifyUser.ts'
import { SpotifyApiError, type SpotifyFetch } from './spotifyApi.ts'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

export async function fetchSpotifyUserProfile(
  accessToken: string,
  fetchImpl: SpotifyFetch = fetch,
): Promise<SpotifyUserProfile> {
  const response = await fetchImpl(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (response.ok) {
    return (await response.json()) as SpotifyUserProfile
  }

  const body = await response.text()
  throw new SpotifyApiError(response.status, body)
}

export function pickUserAvatarUrl(
  images: SpotifyUserProfile['images'] | undefined,
): string | undefined {
  return images?.[0]?.url
}
