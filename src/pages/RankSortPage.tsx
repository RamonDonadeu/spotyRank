import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { RankingTimeInfo } from '../components/RankingTimeInfo'
import { RankComplete } from '../components/RankComplete'
import { SegmentPlacementView } from '../components/ranking/SegmentPlacementView'
import { SortedRankList } from '../components/SortedRankList'
import { useRankingSessionContext } from '../contexts/RankingSessionContext'
import { tracksToRankedItems } from '../helpers/tracksToRankedItems'
import { reconnectSpotify } from '../services/spotifyAuth.ts'

export function RankSortPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useRankingSessionContext()
  const [mobileRankingOpen, setMobileRankingOpen] = useState(false)

  const rankedItems = useMemo(() => tracksToRankedItems(session.sorted), [session.sorted])
  const isComparing = session.phase === 'ranking' && session.placementQuestion

  useEffect(() => {
    if (session.phase === 'select') {
      void navigate('/rank/select', { replace: true })
    }
  }, [session.phase, navigate])

  useEffect(() => {
    if (!isComparing) setMobileRankingOpen(false)
  }, [isComparing])

  const handleReconnect = useCallback(() => {
    void reconnectSpotify()
  }, [])

  const handleBackToSelection = () => {
    session.reset()
    void navigate('/rank/select')
  }

  const showTimeInfo = session.phase === 'ranking' && session.estimatedRemainingTime.maxSeconds > 0

  if (session.phase === 'select') {
    return null
  }

  return (
    <main className={`page rank${isComparing ? ' rank--comparing' : ' rank--sort'}`}>
      {showTimeInfo ? (
        <RankingTimeInfo remainingTime={session.estimatedRemainingTime} />
      ) : null}

      {session.phase === 'done' ? (
        <div className="rank__layout rank__layout--done">
          <section className="rank__panel rank__panel--done">
            <RankComplete items={rankedItems} onReconnect={handleReconnect} />
            <footer className="rank-done__footer">
              <div className="rank__done-actions">
                {session.canUndo ? (
                  <button type="button" className="btn btn--ghost" onClick={session.undoLastPlacement}>
                    {t('rank.undo')}
                  </button>
                ) : null}
                <button type="button" className="btn btn--primary" onClick={handleBackToSelection}>
                  {t('rank.backToSelection')}
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : (
        <div className={`rank__layout${isComparing ? ' rank__layout--compare' : ' rank__layout--sort-active'}`}>
          {isComparing ? (
            <>
              <section className="rank__panel rank__panel--compare">
                <SegmentPlacementView
                  question={session.placementQuestion!}
                  onChooseBucket={session.answerPlacement}
                  onDiscard={session.discardCurrentCandidate}
                  onUndo={session.undoLastPlacement}
                  canUndo={session.canUndo}
                />
              </section>
              <button
                type="button"
                className="rank__show-ranking"
                onClick={() => setMobileRankingOpen(true)}
              >
                {t('rank.showRanking')}
              </button>
              {mobileRankingOpen ? (
                <div
                  className="rank__ranking-overlay"
                  role="presentation"
                  onClick={() => setMobileRankingOpen(false)}
                >
                  <div
                    className="rank__ranking-sheet"
                    role="dialog"
                    aria-modal
                    aria-labelledby="rank-mobile-sheet-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <header className="rank__ranking-sheet-header">
                      <h2 id="rank-mobile-sheet-title">{t('rank.yourRanking')}</h2>
                      <div className="rank__ranking-sheet-actions">
                        {session.canUndo ? (
                          <button
                            type="button"
                            className="btn btn--ghost rank__sheet-undo"
                            onClick={() => {
                              session.undoLastPlacement()
                              setMobileRankingOpen(false)
                            }}
                          >
                            {t('rank.undo')}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rank__ranking-sheet-close"
                          aria-label={t('rank.closeRanking')}
                          onClick={() => setMobileRankingOpen(false)}
                        >
                          ×
                        </button>
                      </div>
                    </header>
                    <SortedRankList sorted={session.sorted} pending={session.currentCandidate} />
                    {session.pool.length > 0 ? (
                      <p className="rank__queue">
                        {t('rank.queueRemaining', { count: session.pool.length })}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <section className="rank__panel rank__panel--compare rank__panel--preparing">
                <p>{t('rank.preparingComparison')}</p>
              </section>
              <section className="rank__panel rank__panel--right rank__panel--sort-sidebar">
                <h2>{t('rank.yourRanking')}</h2>
                <div className="rank__panel-body">
                  <SortedRankList sorted={session.sorted} pending={session.currentCandidate} />
                </div>
                {session.pool.length > 0 ? (
                  <p className="rank__queue">{t('rank.queueRemaining', { count: session.pool.length })}</p>
                ) : null}
              </section>
            </>
          )}
        </div>
      )}
    </main>
  )
}
