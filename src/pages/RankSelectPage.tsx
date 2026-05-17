import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '../components/ChevronLeftIcon'
import { RankingTimeInfo } from '../components/RankingTimeInfo'
import { SearchPanel } from '../components/search/SearchPanel'
import { SelectedTracksPanel } from '../components/SelectedTracksPanel'
import { TrackList } from '../components/TrackList'
import { useRankingSessionContext } from '../contexts/RankingSessionContext'
import { useMatchMedia } from '../hooks/useMatchMedia'
import { logout, reconnectSpotify } from '../services/spotifyAuth.ts'
import { useRankOutletContext } from './RankLayout'

type RankLocationState = { loginSuccess?: boolean }
type MobileStep = 'search' | 'selected'

const MOBILE_SELECT_QUERY = '(max-width: 800px)'

export function RankSelectPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { useMockCatalog } = useRankOutletContext()
  const session = useRankingSessionContext()
  const isMobileSelect = useMatchMedia(MOBILE_SELECT_QUERY)
  const [mobileStep, setMobileStep] = useState<MobileStep>('search')

  const loginSuccess = (location.state as RankLocationState | null)?.loginSuccess === true

  const selectedIds = useMemo(
    () => new Set(session.selected.map((track) => track.id)),
    [session.selected],
  )

  const showTimeInfo =
    session.selected.length > 1 && session.estimatedTotalTime.maxSeconds > 0

  useEffect(() => {
    if (!isMobileSelect) {
      setMobileStep('search')
    }
  }, [isMobileSelect])

  const showSearchPanel = !isMobileSelect || mobileStep === 'search'
  const showSelectedPanel = !isMobileSelect || mobileStep === 'selected'

  const handleStart = () => {
    if (session.selected.length === 0) return
    session.beginRanking()
    void navigate('/rank/sort')
  }

  return (
    <main
      className={`page rank rank--select${isMobileSelect ? ' rank--select-mobile' : ''}`}
    >
      {showTimeInfo ? (
        <RankingTimeInfo
          totalTime={session.estimatedTotalTime}
          largeList={
            session.showLargeListWarning
              ? { count: session.selected.length, threshold: session.largeListThreshold }
              : undefined
          }
        />
      ) : null}

      {!isMobileSelect ? (
        <p className="rank__subtitle">
          {useMockCatalog ? t('rank.subtitleMock') : t('rank.subtitleSelect')}
        </p>
      ) : null}

      {loginSuccess && showSearchPanel && !isMobileSelect ? (
        <p className="banner banner--ok rank__banner" role="status">
          {t('auth.loginSuccessBanner')}
        </p>
      ) : null}

      <div className="rank__layout rank__layout--select">
        {showSearchPanel ? (
          <div className={isMobileSelect ? 'rank__select-step' : undefined}>
          <section className="rank__panel rank__panel--search">
            <h2>{useMockCatalog ? t('rank.selectTracks') : t('rank.searchTracks')}</h2>
            <div className="rank__panel-body">
              {useMockCatalog ? (
                <TrackList
                  tracks={session.availableTracks}
                  selectedIds={selectedIds}
                  onToggle={session.toggleSelect}
                />
              ) : (
                <SearchPanel
                  selectedIds={selectedIds}
                  onAddTracks={session.addTracks}
                  onSessionExpired={() => {
                    logout()
                    void navigate('/login')
                  }}
                  onReconnect={() => {
                    void reconnectSpotify()
                  }}
                />
              )}
            </div>
          </section>
            {isMobileSelect ? (
              <footer className="rank__panel-footer">
                <button
                  type="button"
                  className="btn btn--primary rank__continue-btn"
                  onClick={() => setMobileStep('selected')}
                >
                  {t('rank.continueToSelection', { count: session.selected.length })}
                </button>
              </footer>
            ) : null}
          </div>
        ) : null}

        {showSelectedPanel ? (
          <div className={isMobileSelect ? 'rank__select-step' : undefined}>
            <section className="rank__panel rank__panel--selected">
              {isMobileSelect ? (
                <div className="rank__panel-top-actions">
                  <button
                    type="button"
                    className="btn btn--ghost rank__back-btn"
                    onClick={() => setMobileStep('search')}
                  >
                    <ChevronLeftIcon className="rank__back-btn-icon" />
                    <span>{t('rank.backToSearch')}</span>
                  </button>
                </div>
              ) : null}
              <h2>{t('rank.selectedToRank')}</h2>
              <p className="rank__panel-meta">
                {t('rank.selectedCount', { count: session.selected.length })}
              </p>
              <div className="rank__panel-body">
                {session.selected.length === 0 ? (
                  <p className="rank__empty">{t('rank.emptySelection')}</p>
                ) : (
                  <SelectedTracksPanel
                    tracks={session.selected}
                    onRemoveTrack={session.removeTrack}
                    onRemoveAlbum={session.removeAlbum}
                  />
                )}
              </div>
              {!isMobileSelect ? (
                <footer className="rank__panel-footer">
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={session.selected.length === 0}
                    onClick={handleStart}
                  >
                    {t('rank.startRanking')}
                  </button>
                </footer>
              ) : null}
            </section>
            {isMobileSelect ? (
              <footer className="rank__panel-footer">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={session.selected.length === 0}
                  onClick={handleStart}
                >
                  {t('rank.startRanking')}
                </button>
              </footer>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  )
}
