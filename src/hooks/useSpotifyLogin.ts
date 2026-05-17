import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  getAuthSnapshot,
  isMockMode,
  isOAuthConfigured,
  logout as clearSpotifySession,
  reconnectSpotify,
  startSpotifyLogin,
  subscribeAuth,
  type SpotifyLoginOptions,
} from '../services/spotifyAuth.ts'

export type UseSpotifyLoginResult = {
  isConfigured: boolean
  isAuthenticated: boolean
  isMock: boolean
  login: (options?: SpotifyLoginOptions) => Promise<void>
  reconnect: () => Promise<void>
  logout: () => void
}

export function useSpotifyLogin(): UseSpotifyLoginResult {
  const isConfigured = isOAuthConfigured()
  const isAuthenticated = useSyncExternalStore(subscribeAuth, getAuthSnapshot, () => false)
  const isMock = isMockMode()

  const login = useCallback(async (options?: SpotifyLoginOptions) => {
    await startSpotifyLogin(options)
  }, [])

  const reconnect = useCallback(async () => {
    await reconnectSpotify()
  }, [])

  const logout = useCallback(() => {
    clearSpotifySession()
  }, [])

  return useMemo(
    () => ({
      isConfigured,
      isAuthenticated,
      isMock,
      login,
      reconnect,
      logout,
    }),
    [isConfigured, isAuthenticated, isMock, login, reconnect, logout],
  )
}
