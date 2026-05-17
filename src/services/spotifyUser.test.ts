import { describe, expect, it, vi } from 'vitest'
import { fetchSpotifyUserProfile, pickUserAvatarUrl } from './spotifyUser.ts'
import { SpotifyApiError } from './spotifyApi.ts'

describe('fetchSpotifyUserProfile', () => {
  it('returns profile from GET /me', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        id: 'user1',
        display_name: 'Test User',
        images: [{ url: 'https://img.example/avatar.jpg' }],
      }),
    )

    const profile = await fetchSpotifyUserProfile('token', fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    )
    expect(profile.display_name).toBe('Test User')
  })

  it('throws SpotifyApiError on 401', async () => {
    const fetchImpl = vi.fn(async () => new Response('Unauthorized', { status: 401 }))

    await expect(fetchSpotifyUserProfile('bad-token', fetchImpl)).rejects.toBeInstanceOf(
      SpotifyApiError,
    )
  })
})

describe('pickUserAvatarUrl', () => {
  it('returns first image url', () => {
    expect(pickUserAvatarUrl([{ url: 'https://a.test/1.jpg' }])).toBe('https://a.test/1.jpg')
  })

  it('returns undefined when no images', () => {
    expect(pickUserAvatarUrl(undefined)).toBeUndefined()
  })
})
