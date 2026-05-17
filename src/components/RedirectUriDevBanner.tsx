import { useTranslation } from 'react-i18next'
import { translateRedirectWarning } from '../i18n/authMessages.ts'
import { getRedirectUriDevWarning, isOAuthConfigured } from '../services/spotifyAuth.ts'

/** Dev-only OAuth redirect URI mismatch warnings. */
export function RedirectUriDevBanner() {
  const { t } = useTranslation()
  if (!import.meta.env.DEV || !isOAuthConfigured()) return null

  const warning = getRedirectUriDevWarning()
  if (!warning) return null

  return (
    <aside className="banner banner--warn" role="status">
      {translateRedirectWarning(warning, t)}
    </aside>
  )
}
