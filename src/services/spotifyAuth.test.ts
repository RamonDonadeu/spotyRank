import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildAuthorizeUrl,
  createCodeChallenge,
  createCodeVerifier,
  exchangeCodeForToken,
  getAccessToken,
  getGrantedScopes,
  getRedirectUri,
  getRedirectUriDevWarning,
  handleOAuthCallback,
  isOAuthCallbackSearch,
  isOAuthConfigured,
  markOAuthCodeHandled,
  wasOAuthCodeHandled,
} from './spotifyAuth.ts'

const sessionStore = new Map<string, string>()

const sessionStorageMock: Storage = {
  get length() {
    return sessionStore.size
  },
  clear() {
    sessionStore.clear()
  },
  getItem(key: string) {
    return sessionStore.get(key) ?? null
  },
  setItem(key: string, value: string) {
    sessionStore.set(key, value)
  },
  removeItem(key: string) {
    sessionStore.delete(key)
  },
  key() {
    return null
  },
}

describe('spotifyAuth', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('isOAuthConfigured', () => {
    it('is false when client id is missing', () => {
      vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', '')
      expect(isOAuthConfigured()).toBe(false)
    })

    it('is false for the example placeholder', () => {
      vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'your_client_id')
      expect(isOAuthConfigured()).toBe(false)
    })

    it('is true when a real client id is set', () => {
      vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'abc123')
      expect(isOAuthConfigured()).toBe(true)
    })
  })

  describe('PKCE', () => {
    it('creates a verifier within PKCE charset', () => {
      const verifier = createCodeVerifier(43)
      expect(verifier).toHaveLength(43)
      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/)
    })

    it('creates a stable S256 challenge for a known verifier', async () => {
      const challenge = await createCodeChallenge('test-verifier-value')
      expect(challenge).toBe('R-yFp3ykg184xTSr9BXHiHtbqWZXIG_H4B3K5EWSDzM')
    })
  })

  describe('getRedirectUri', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('uses browser origin for local dev when env host differs', () => {
      vi.stubEnv('MODE', 'development')
      vi.stubEnv('VITE_SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:5173/login/callback')
      vi.stubGlobal('window', {
        location: {
          origin: 'http://localhost:5173',
          hostname: 'localhost',
          port: '5173',
          protocol: 'http:',
        },
      })

      expect(getRedirectUri()).toBe('http://localhost:5173/login/callback')
    })
  })

  describe('getRedirectUriDevWarning', () => {
    it('warns when production HTTPS redirect is set in dev', () => {
      vi.stubEnv('MODE', 'development')
      vi.stubEnv('VITE_SPOTIFY_REDIRECT_URI', 'https://spotyrank.radoca.xyz/login/callback')
      expect(getRedirectUriDevWarning()).toEqual({ kind: 'productionHttps' })
    })

    it('warns when local redirect still uses https in dev', () => {
      vi.stubEnv('MODE', 'development')
      vi.stubEnv('VITE_SPOTIFY_REDIRECT_URI', 'https://127.0.0.1:5173/login/callback')
      expect(getRedirectUriDevWarning()).toEqual({ kind: 'localHttps' })
    })

    it('is null for local http redirect in dev', () => {
      vi.stubEnv('MODE', 'development')
      vi.stubEnv('VITE_SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:5173/login/callback')
      expect(getRedirectUriDevWarning()).toBeNull()
    })
  })

  describe('buildAuthorizeUrl', () => {
    it('includes client, redirect, scopes, and PKCE params', () => {
      vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'client-1')
      vi.stubEnv('VITE_SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:5173/login/callback')

      const url = new URL(buildAuthorizeUrl('challenge-xyz'))
      expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
      expect(url.searchParams.get('client_id')).toBe('client-1')
      expect(url.searchParams.get('redirect_uri')).toBe(
        'http://127.0.0.1:5173/login/callback',
      )
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      expect(url.searchParams.get('code_challenge')).toBe('challenge-xyz')
      expect(url.searchParams.get('scope')).toContain('user-library-read')
      expect(url.searchParams.get('scope')).toContain('user-library-modify')
      expect(url.searchParams.get('scope')).toContain('playlist-modify-private')
    })

    it('requests consent again when forceConsent is set', () => {
      vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'client-1')
      vi.stubEnv('VITE_SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:5173/login/callback')

      const url = new URL(buildAuthorizeUrl('challenge-xyz', undefined, { forceConsent: true }))
      expect(url.searchParams.get('show_dialog')).toBe('true')
    })
  })

  describe('OAuth callback', () => {
    beforeEach(() => {
      sessionStore.clear()
      vi.stubGlobal('sessionStorage', sessionStorageMock)
      vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'client-1')
      vi.stubEnv('VITE_SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:5173/login/callback')
      vi.stubEnv('VITE_SPOTIFY_MOCK', 'false')
    })

    afterEach(() => {
      sessionStore.clear()
    })

    it('detects callback search params', () => {
      expect(isOAuthCallbackSearch(new URLSearchParams('code=abc'))).toBe(true)
      expect(isOAuthCallbackSearch(new URLSearchParams('error=access_denied'))).toBe(true)
      expect(isOAuthCallbackSearch(new URLSearchParams('state=xyz'))).toBe(false)
    })

    it('stores token and marks code handled on success', async () => {
      sessionStorage.setItem('spotify_pkce_verifier', 'verifier-1')
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'token-abc',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'user-library-read user-library-modify user-follow-modify',
        }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await handleOAuthCallback(new URLSearchParams('code=auth-code-1'))

      expect(getAccessToken()).toBe('token-abc')
      expect(getGrantedScopes()).toEqual([
        'user-library-read',
        'user-library-modify',
        'user-follow-modify',
      ])
      expect(wasOAuthCodeHandled('auth-code-1')).toBe(true)
      expect(sessionStorage.getItem('spotify_pkce_verifier')).toBeNull()
    })

    it('skips duplicate exchange for the same code when token exists', async () => {
      sessionStorage.setItem('spotify_access_token', 'existing-token')
      markOAuthCodeHandled('auth-code-2')
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      await handleOAuthCallback(new URLSearchParams('code=auth-code-2'))

      expect(fetchMock).not.toHaveBeenCalled()
      expect(getAccessToken()).toBe('existing-token')
    })

    it('keeps PKCE verifier when token exchange fails', async () => {
      sessionStorage.setItem('spotify_pkce_verifier', 'verifier-2')
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: async () =>
            JSON.stringify({
              error: 'invalid_grant',
              error_description: 'Invalid authorization code',
            }),
        }),
      )

      await expect(exchangeCodeForToken('bad-code')).rejects.toThrow(/invalid_grant/)
      expect(sessionStorage.getItem('spotify_pkce_verifier')).toBe('verifier-2')
    })
  })
})
