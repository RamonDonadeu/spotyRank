import { useTranslation } from 'react-i18next'
import { Link, Outlet, useOutletContext } from 'react-router-dom'
import { RankingSessionProvider } from '../contexts/RankingSessionContext'
import { MOCK_TRACKS } from '../data/mockTracks'
import { useSpotifyLogin } from '../hooks/useSpotifyLogin.ts'

export type RankOutletContext = {
  useMockCatalog: boolean
}

export function RankLayout() {
  const { t } = useTranslation()
  const { isAuthenticated, isMock, login } = useSpotifyLogin()
  const useMockCatalog = isMock && !isAuthenticated
  const canRank = isAuthenticated || useMockCatalog

  if (!canRank) {
    return (
      <div className="page rank">
        <p className="rank__auth-prompt">{t('rank.loginRequired')}</p>
        <div className="home__actions">
          <button type="button" className="btn btn--primary" onClick={() => void login()}>
            {t('home.connectSpotify')}
          </button>
          <Link className="btn btn--ghost" to="/">
            {t('common.backHome')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <RankingSessionProvider initialTracks={useMockCatalog ? MOCK_TRACKS : []}>
      <Outlet context={{ useMockCatalog } satisfies RankOutletContext} />
    </RankingSessionProvider>
  )
}

export function useRankOutletContext(): RankOutletContext {
  return useOutletContext<RankOutletContext>()
}
