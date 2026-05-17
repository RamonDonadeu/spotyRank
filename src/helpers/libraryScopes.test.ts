import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RankedItem } from '../services/apiTypes/rankedItem.ts'
import { getRequiredSaveScopes, hasSaveScopesForItems } from './libraryScopes.ts'

const sessionStore = new Map<string, string>()

vi.stubGlobal('sessionStorage', {
  get length() {
    return sessionStore.size
  },
  clear() {
    sessionStore.clear()
  },
  getItem: (key: string) => sessionStore.get(key) ?? null,
  setItem: (key: string, value: string) => sessionStore.set(key, value),
  removeItem: (key: string) => sessionStore.delete(key),
  key: () => null,
} as Storage)

function track(id: string): RankedItem {
  return { id, type: 'track', name: id }
}

describe('libraryScopes', () => {
  beforeEach(() => {
    sessionStore.clear()
  })

  it('requires library modify for tracks and albums', () => {
    expect(getRequiredSaveScopes([track('a')])).toEqual(['user-library-modify'])
    expect(
      getRequiredSaveScopes([{ id: 'alb', type: 'album', name: 'Album' }]),
    ).toEqual(['user-library-modify'])
  })

  it('requires follow modify for artists', () => {
    expect(
      getRequiredSaveScopes([{ id: 'art', type: 'artist', name: 'Artist' }]),
    ).toEqual(['user-follow-modify'])
  })

  it('allows save when granted scopes are unknown', () => {
    expect(hasSaveScopesForItems([track('a')])).toBe(true)
  })

  it('blocks save when stored scopes are missing library modify', () => {
    sessionStore.set('spotify_granted_scopes', 'user-library-read')
    expect(hasSaveScopesForItems([track('a')])).toBe(false)
  })
})
