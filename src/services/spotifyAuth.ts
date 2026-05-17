/** Scopes requested during PKCE login (concatenate with space for authorize URL). */
export const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'user-library-modify',
  'user-follow-modify',
  'playlist-read-private',
  'playlist-modify-private',
] as const

export const SPOTIFY_SCOPE_STRING = SPOTIFY_SCOPES.join(' ')

const ACCESS_TOKEN_KEY = 'spotify_access_token'
const GRANTED_SCOPES_KEY = 'spotify_granted_scopes'
const PKCE_VERIFIER_KEY = 'spotify_pkce_verifier'
const OAUTH_HANDLED_CODE_KEY = 'spotify_oauth_handled_code'

function authDebug(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug('[spotifyAuth]', ...args)
  }
}

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

const PKCE_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

export type SpotifyTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

export class SpotifyAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SpotifyAuthError'
  }
}

export function getSpotifyClientId(): string {
  return (import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '').trim()
}

function getEnvRedirectUri(): string {
  return (import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? '').trim()
}

/**
 * OAuth redirect URI sent to Spotify. In local dev, if you open the app on
 * localhost but .env uses 127.0.0.1 (or the reverse), we use the browser origin
 * so login matches how you are browsing — both hosts must be listed in Spotify.
 */
export function getRedirectUri(): string {
  const fromEnv = getEnvRedirectUri()
  if (!fromEnv) return fromEnv

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      const envParsed = new URL(fromEnv)
      const { hostname, port, protocol } = window.location
      const isEnvLocal =
        envParsed.hostname === '127.0.0.1' || envParsed.hostname === 'localhost'
      const isBrowserLocal = hostname === '127.0.0.1' || hostname === 'localhost'
      const envPort = envParsed.port || (envParsed.protocol === 'https:' ? '443' : '80')
      const browserPort = port || (protocol === 'https:' ? '443' : '80')

      if (
        isEnvLocal &&
        isBrowserLocal &&
        envParsed.protocol === protocol &&
        envPort === browserPort &&
        envParsed.pathname === '/login/callback' &&
        envParsed.origin !== window.location.origin
      ) {
        return `${window.location.origin}/login/callback`
      }
    } catch {
      /* use env */
    }
  }

  return fromEnv
}

export type RedirectUriDevWarning =
  | { kind: 'productionHttps' }
  | { kind: 'localHttps' }
  | {
      kind: 'hostnameMismatch'
      browserOrigin: string
      envHost: string
      envOrigin: string
    }
  | { kind: 'portMismatch'; envPort: string; browserPort: string }

/** Dev-only hint when .env redirect URI does not match how you run the app locally. */
export function getRedirectUriDevWarning(): RedirectUriDevWarning | null {
  if (!import.meta.env.DEV) return null

  const redirectUri = getRedirectUri()
  if (!redirectUri) return null

  let parsed: URL
  try {
    parsed = new URL(redirectUri)
  } catch {
    return null
  }

  const isLocalHost =
    parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'

  const isLocalHttps = parsed.protocol === 'https:' && isLocalHost
  const isLocalHttp = parsed.protocol === 'http:' && isLocalHost

  if (parsed.protocol === 'https:' && !isLocalHost) {
    return { kind: 'productionHttps' }
  }

  if (isLocalHttps) {
    return { kind: 'localHttps' }
  }

  if (typeof window !== 'undefined' && isLocalHttp) {
    const { hostname, port } = window.location
    const browserIsLocal = hostname === '127.0.0.1' || hostname === 'localhost'
    if (browserIsLocal && hostname !== parsed.hostname) {
      const envOrigin = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`
      return {
        kind: 'hostnameMismatch',
        browserOrigin: window.location.origin,
        envHost: parsed.hostname,
        envOrigin,
      }
    }
    if (browserIsLocal && port && parsed.port && port !== parsed.port) {
      return {
        kind: 'portMismatch',
        envPort: parsed.port,
        browserPort: port,
      }
    }
  }

  return null
}

/** True when a real client ID is set (not empty or the .env.example placeholder). */
export function isOAuthConfigured(): boolean {
  const id = getSpotifyClientId()
  return id.length > 0 && id !== 'your_client_id'
}

export function isMockMode(): boolean {
  return import.meta.env.VITE_SPOTIFY_MOCK === 'true'
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function parseGrantedScopes(scopeString: string | undefined | null): string[] {
  if (!scopeString?.trim()) return []
  return scopeString.trim().split(/\s+/)
}

export function getGrantedScopes(): string[] {
  return parseGrantedScopes(sessionStorage.getItem(GRANTED_SCOPES_KEY))
}

export function setGrantedScopes(scopes: readonly string[]): void {
  if (scopes.length === 0) {
    sessionStorage.removeItem(GRANTED_SCOPES_KEY)
    return
  }
  sessionStorage.setItem(GRANTED_SCOPES_KEY, scopes.join(' '))
}

type AuthListener = () => void

const authListeners = new Set<AuthListener>()

function notifyAuthListeners(): void {
  for (const listener of authListeners) {
    listener()
  }
}

/** Subscribe to login/logout so React hooks can re-render. */
export function subscribeAuth(listener: AuthListener): () => void {
  authListeners.add(listener)
  return () => authListeners.delete(listener)
}

export function getAuthSnapshot(): boolean {
  return getAccessToken() !== null
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
  authDebug('access token stored')
  notifyAuthListeners()
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  notifyAuthListeners()
}

export function isLoggedIn(): boolean {
  return getAccessToken() !== null
}

export function createCodeVerifier(length = 64): string {
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (byte) => PKCE_CHARSET[byte % PKCE_CHARSET.length]).join('')
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64UrlEncode(digest)
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export type SpotifyLoginOptions = {
  /** Ask Spotify to show the consent screen again (needed after adding scopes). */
  forceConsent?: boolean
}

export function buildAuthorizeUrl(
  codeChallenge: string,
  state?: string,
  options?: SpotifyLoginOptions,
): string {
  const clientId = getSpotifyClientId()
  const redirectUri = getRedirectUri()
  if (!clientId || !redirectUri) {
    throw new SpotifyAuthError('Spotify OAuth is not configured.')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPE_STRING,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  })
  if (state) {
    params.set('state', state)
  }
  if (options?.forceConsent) {
    params.set('show_dialog', 'true')
  }

  return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`
}

export function wasOAuthCodeHandled(code: string): boolean {
  return sessionStorage.getItem(OAUTH_HANDLED_CODE_KEY) === code
}

export function markOAuthCodeHandled(code: string): void {
  sessionStorage.setItem(OAUTH_HANDLED_CODE_KEY, code)
}

/** Redirect to Spotify; stores PKCE verifier in sessionStorage. */
export async function startSpotifyLogin(options?: SpotifyLoginOptions): Promise<void> {
  if (!isOAuthConfigured()) {
    throw new SpotifyAuthError('Spotify OAuth is not configured.')
  }
  if (isMockMode()) {
    authDebug('mock login — storing mock token')
    setAccessToken('mock-token')
    setGrantedScopes([...SPOTIFY_SCOPES])
    return
  }

  sessionStorage.removeItem(OAUTH_HANDLED_CODE_KEY)
  const verifier = createCodeVerifier()
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
  authDebug('PKCE verifier stored, redirecting to Spotify', { redirectUri: getRedirectUri() })
  const challenge = await createCodeChallenge(verifier)
  window.location.assign(buildAuthorizeUrl(challenge, undefined, options))
}

function parseTokenErrorBody(status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as { error?: string; error_description?: string }
    const code = parsed.error ?? 'unknown'
    const description = parsed.error_description?.trim()
    if (description) {
      return `Token exchange failed (${status}, ${code}): ${description}`
    }
    return `Token exchange failed (${status}, ${code}). Check redirect URI and client ID.`
  } catch {
    return `Token exchange failed (${status}). Check redirect URI and client ID.`
  }
}

export async function exchangeCodeForToken(code: string): Promise<SpotifyTokenResponse> {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)

  if (!verifier) {
    authDebug('exchangeCodeForToken: missing PKCE verifier')
    throw new SpotifyAuthError('Missing PKCE verifier. Start login again from the app.')
  }

  const clientId = getSpotifyClientId()
  const redirectUri = getRedirectUri()
  if (!clientId || !redirectUri) {
    throw new SpotifyAuthError('Spotify OAuth is not configured.')
  }

  authDebug('exchanging authorization code for token', { redirectUri })

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  })

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const bodyText = await response.text()
    authDebug('token exchange failed', { status: response.status, body: bodyText })
    throw new SpotifyAuthError(parseTokenErrorBody(response.status, bodyText))
  }

  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  authDebug('token exchange succeeded')
  return (await response.json()) as SpotifyTokenResponse
}

/** True when the URL looks like an OAuth return (code or error in query). */
export function isOAuthCallbackSearch(searchParams: URLSearchParams): boolean {
  return searchParams.has('code') || searchParams.has('error')
}

/** Parse Spotify callback query params and store the access token. */
export async function handleOAuthCallback(
  searchParams: URLSearchParams,
): Promise<void> {
  authDebug('handleOAuthCallback', {
    hasCode: searchParams.has('code'),
    hasError: searchParams.has('error'),
  })

  const error = searchParams.get('error')
  if (error) {
    const description = searchParams.get('error_description') ?? ''
    const lower = description.toLowerCase()
    if (lower.includes('redirect_uri') || lower.includes('not matching configuration')) {
      throw new SpotifyAuthError(`Redirect URI mismatch (${getRedirectUri()}).`)
    }
    throw new SpotifyAuthError(
      description || `Spotify login denied (${error}).`,
    )
  }

  const code = searchParams.get('code')
  if (!code) {
    throw new SpotifyAuthError('Missing authorization code in callback URL.')
  }

  if (wasOAuthCodeHandled(code)) {
    authDebug('authorization code already exchanged (Strict Mode / remount)')
    if (!getAccessToken()) {
      throw new SpotifyAuthError(
        'Login callback was already processed but no token is stored. Clear session storage and try again.',
      )
    }
    return
  }

  if (isMockMode()) {
    markOAuthCodeHandled(code)
    setAccessToken('mock-token')
    setGrantedScopes([...SPOTIFY_SCOPES])
    return
  }

  const token = await exchangeCodeForToken(code)
  markOAuthCodeHandled(code)
  setAccessToken(token.access_token)
  setGrantedScopes(parseGrantedScopes(token.scope))
}

/** Dev-friendly session check on app load (does not block UI). */
export function initAuthSession(): void {
  authDebug('initAuthSession', {
    hasToken: getAccessToken() !== null,
    redirectUri: getRedirectUri(),
    mock: isMockMode(),
    configured: isOAuthConfigured(),
  })
}

export function logout(): void {
  authDebug('logout')
  clearAccessToken()
  sessionStorage.removeItem(GRANTED_SCOPES_KEY)
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(OAUTH_HANDLED_CODE_KEY)
}

/** Clear session and start OAuth with the consent screen so new scopes can be granted. */
export async function reconnectSpotify(): Promise<void> {
  logout()
  await startSpotifyLogin({ forceConsent: true })
}
