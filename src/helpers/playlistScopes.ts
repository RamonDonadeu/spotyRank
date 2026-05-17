import { getGrantedScopes } from '../services/spotifyAuth.ts'

export const PLAYLIST_SAVE_SCOPES = ['playlist-modify-private', 'playlist-modify-public'] as const

export function hasPlaylistSaveScope(): boolean {
  const granted = getGrantedScopes()
  if (granted.length === 0) return true
  const grantedSet = new Set(granted)
  return PLAYLIST_SAVE_SCOPES.some((scope) => grantedSet.has(scope))
}
