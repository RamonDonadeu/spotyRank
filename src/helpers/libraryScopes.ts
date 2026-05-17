import type { RankedItem } from '../services/apiTypes/rankedItem.ts'
import { getGrantedScopes } from '../services/spotifyAuth.ts'

/** Scopes required to save ranked items to the user's Spotify library. */
export function getRequiredSaveScopes(items: readonly RankedItem[]): string[] {
  const required = new Set<string>()
  for (const item of items) {
    if (item.type === 'track' || item.type === 'album') {
      required.add('user-library-modify')
    } else if (item.type === 'artist') {
      required.add('user-follow-modify')
    }
  }
  return [...required]
}

/**
 * True when stored granted scopes include everything needed to save `items`.
 * If scopes were never stored (older session), returns true so the API can be tried.
 */
export function hasSaveScopesForItems(items: readonly RankedItem[]): boolean {
  const granted = getGrantedScopes()
  if (granted.length === 0) return true
  const grantedSet = new Set(granted)
  return getRequiredSaveScopes(items).every((scope) => grantedSet.has(scope))
}
