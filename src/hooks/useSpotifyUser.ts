import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { SpotifyUserProfile } from '../services/apiTypes/spotifyUser.ts'
import { SpotifyApiError } from '../services/spotifyApi.ts'
import {
  getAccessToken,
  isMockMode,
  logout,
  subscribeAuth,
} from '../services/spotifyAuth.ts'
import { fetchSpotifyUserProfile } from '../services/spotifyUser.ts'

export type SpotifyUserState =
  | { status: 'anonymous' }
  | { status: 'loading' }
  | { status: 'authenticated'; profile: SpotifyUserProfile; isMock: boolean }
  | { status: 'expired' }
  | { status: 'error'; message: string }

const MOCK_PROFILE: SpotifyUserProfile = {
  id: 'mock-user',
  display_name: 'Mock User',
}

function initialUserState(): SpotifyUserState {
  return getAccessToken() ? { status: 'loading' } : { status: 'anonymous' }
}

export function useSpotifyUser(): SpotifyUserState {
  const hasToken = useSyncExternalStore(subscribeAuth, () => getAccessToken() !== null, () => false)
  const [state, setState] = useState<SpotifyUserState>(initialUserState)

  const loadProfile = useCallback(async (token: string, signal: AbortSignal) => {
    if (isMockMode()) {
      setState({ status: 'authenticated', profile: MOCK_PROFILE, isMock: true })
      return
    }

    setState({ status: 'loading' })
    try {
      const profile = await fetchSpotifyUserProfile(token)
      if (!signal.aborted) {
        setState({ status: 'authenticated', profile, isMock: false })
      }
    } catch (err) {
      if (signal.aborted) return
      if (err instanceof SpotifyApiError && err.status === 401) {
        logout()
        setState({ status: 'expired' })
        return
      }
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load profile',
      })
    }
  }, [])

  useEffect(() => {
    if (!hasToken) {
      setState({ status: 'anonymous' })
      return
    }

    const token = getAccessToken()
    if (!token) {
      setState({ status: 'anonymous' })
      return
    }

    const controller = new AbortController()
    void loadProfile(token, controller.signal)
    return () => controller.abort()
  }, [hasToken, loadProfile])

  useEffect(() => {
    if (state.status !== 'error' || !hasToken) return

    const token = getAccessToken()
    if (!token) return

    const retryTimer = window.setTimeout(() => {
      void loadProfile(token, new AbortController().signal)
    }, 8000)

    return () => window.clearTimeout(retryTimer)
  }, [state.status, hasToken, loadProfile])

  return state
}
