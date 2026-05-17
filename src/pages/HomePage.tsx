import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { RedirectUriDevBanner } from '../components/RedirectUriDevBanner.tsx'
import { SpotifyUserBadge } from '../components/SpotifyUserBadge.tsx'
import { useSpotifyLogin } from '../hooks/useSpotifyLogin.ts'
export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isConfigured, isAuthenticated, isMock, login, reconnect, logout } = useSpotifyLogin()

  const handleLogout = () => {
    logout()
    void navigate('/')
  }

  return (
    <main className="page home">
      <RedirectUriDevBanner />
      <p className="lead">{t('home.lead')}</p>
      <ul className="home__features">
        <li>{isAuthenticated || isMock ? t('home.featureSearch') : t('home.featureSearchSoon')}</li>
        <li>{t('home.featurePairwise')}</li>
        <li>{t('home.featureShare')}</li>
      </ul>

      <SpotifyUserBadge
        showConnectWhenAnonymous={isConfigured && !isMock}
        onConnect={() => void login()}
        onReconnect={() => void reconnect()}
      />

      <div className="home__actions">
        {isAuthenticated ? (
          <>
            <Link className="btn btn--primary" to="/rank/select">
              {t('home.startRanking')}
            </Link>
            <button type="button" className="btn btn--ghost" onClick={handleLogout}>
              {t('home.logOut')}
            </button>
          </>
        ) : isMock ? (
          <>
            <button type="button" className="btn btn--primary" onClick={() => void login()}>
              {t('home.continueWithoutSpotify')}
            </button>
            <Link className="btn btn--ghost" to="/rank/select">
              {t('home.tryPrototype')}
            </Link>
            {isConfigured ? (
              <button type="button" className="btn btn--ghost" onClick={() => void login()}>
                {t('home.connectSpotify')}
              </button>
            ) : null}
          </>
        ) : isConfigured ? (
          <button type="button" className="btn btn--primary" onClick={() => void login()}>
            {t('home.connectSpotify')}
          </button>
        ) : (
          <Link className="btn btn--primary" to="/login">
            {t('home.spotifyLogin')}
          </Link>
        )}
      </div>
    </main>
  )
}
