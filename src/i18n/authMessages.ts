import type { TFunction } from 'i18next'
import type { RedirectUriDevWarning } from '../services/spotifyAuth.ts'
import { getRedirectUri } from '../services/spotifyAuth.ts'

/** Map SpotifyAuthError English messages to translation keys. */
export function translateAuthErrorMessage(message: string, t: TFunction): string {
  const exact: Record<string, string> = {
    'Spotify OAuth is not configured.': 'auth.errors.oauthNotConfigured',
    'Missing PKCE verifier. Start login again from the app.': 'auth.errors.missingPkceVerifier',
    'Missing authorization code in callback URL.': 'auth.errors.missingAuthCode',
    'Login callback was already processed but no token is stored. Clear session storage and try again.':
      'auth.errors.callbackWithoutToken',
  }

  const exactKey = exact[message]
  if (exactKey) {
    return t(exactKey)
  }

  if (message.startsWith('Redirect URI mismatch')) {
    return t('auth.errors.redirectUriMismatch', { uri: getRedirectUri() })
  }

  if (message.startsWith('Token exchange failed')) {
    return message
  }

  const lower = message.toLowerCase()
  if (lower.includes('redirect_uri') || lower.includes('not matching configuration')) {
    return t('auth.errors.redirectUriMismatch', { uri: getRedirectUri() })
  }

  const deniedMatch = /^Spotify login denied \((.+)\)\.$/.exec(message)
  if (deniedMatch) {
    return t('auth.errors.loginDenied', { error: deniedMatch[1] })
  }

  return message
}

export function translateRedirectWarning(warning: RedirectUriDevWarning, t: TFunction): string {
  switch (warning.kind) {
    case 'productionHttps':
      return t('auth.redirectWarnings.productionHttps')
    case 'localHttps':
      return t('auth.redirectWarnings.localHttps')
    case 'hostnameMismatch':
      return t('auth.redirectWarnings.hostnameMismatch', {
        browserOrigin: warning.browserOrigin,
        envHost: warning.envHost,
        envOrigin: warning.envOrigin,
      })
    case 'portMismatch':
      return t('auth.redirectWarnings.portMismatch', {
        envPort: warning.envPort,
        browserPort: warning.browserPort,
      })
  }
}
