import { useTranslation } from 'react-i18next'
import type { SegmentPlacementQuestion } from '../../helpers/ranking/types'
import { estimateSegmentPlacementRounds } from '../../helpers/ranking/segmentPlacement'
import './ranking.css'

interface Props {
  question: SegmentPlacementQuestion
  onChooseBucket: (bucketIndex: number) => void
  onDiscard: () => void
  onUndo: () => void
  canUndo: boolean
}

function isBucketSelectable(bucket: { low: number; high: number } | undefined): boolean {
  return Boolean(bucket && bucket.high > bucket.low)
}

export function SegmentPlacementView({
  question,
  onChooseBucket,
  onDiscard,
  onUndo,
  canUndo,
}: Props) {
  const { t } = useTranslation()
  const rangeSize = question.range.high - question.range.low
  const totalEstimate = estimateSegmentPlacementRounds(rangeSize)
  const { candidate, pivots, buckets } = question

  return (
    <section className="segment-placement" aria-label={t('compare.ariaLabel')}>
      <header className="segment-placement__header">
        <p className="segment-placement__progress">
          {t('compare.progress', {
            round: question.round,
            total: Math.max(totalEstimate, question.round),
          })}
        </p>
        {canUndo ? (
          <button
            type="button"
            className="segment-placement__undo"
            onClick={onUndo}
            aria-label={t('rank.undoLastSong')}
          >
            {t('rank.undo')}
          </button>
        ) : null}
      </header>

      <div className="segment-placement__candidate">
        <p className="segment-placement__candidate-label">{t('compare.placeThisSong')}</p>
        <div className="segment-placement__candidate-card">
          {candidate.imageUrl ? (
            <img
              className="segment-placement__candidate-art"
              src={candidate.imageUrl}
              alt=""
              width={48}
              height={48}
            />
          ) : (
            <span className="segment-placement__candidate-art segment-placement__candidate-art--placeholder" />
          )}
          <div className="segment-placement__candidate-meta">
            <span className="segment-placement__candidate-name">{candidate.name}</span>
            <span className="segment-placement__candidate-artist">{candidate.artist}</span>
          </div>
        </div>
        <button
          type="button"
          className="segment-placement__discard"
          onClick={onDiscard}
        >
          {t('compare.discardSong')}
        </button>
      </div>

      <div className="segment-placement__list">
        <p className="segment-placement__list-edge">{t('compare.listStart')}</p>

        {isBucketSelectable(buckets[0]) ? (
          <button
            type="button"
            className="segment-placement__here-row"
            onClick={() => onChooseBucket(0)}
          >
            {t('compare.here')}
          </button>
        ) : null}

        {pivots.map((pivot, index) => {
          const bucketIndex = index + 1
          const bucket = buckets[bucketIndex]
          if (!pivot.track) return null

          return (
            <div key={`${pivot.boundaryIndex}-${index}`} className="segment-placement__block">
              <div className="segment-placement__row">
                {pivot.track.imageUrl ? (
                  <img
                    className="segment-placement__row-art"
                    src={pivot.track.imageUrl}
                    alt=""
                    width={48}
                    height={48}
                  />
                ) : (
                  <span className="segment-placement__row-art segment-placement__row-art--placeholder" />
                )}
                <div className="segment-placement__row-meta">
                  <span className="segment-placement__row-name">{pivot.track.name}</span>
                  <span className="segment-placement__row-artist">{pivot.track.artist}</span>
                </div>
                {pivot.positionInList != null ? (
                  <span className="segment-placement__row-pos">#{pivot.positionInList}</span>
                ) : null}
              </div>
              {isBucketSelectable(bucket) ? (
                <button
                  type="button"
                  className="segment-placement__here-row"
                  onClick={() => onChooseBucket(bucketIndex)}
                >
                  {t('compare.here')}
                </button>
              ) : null}
            </div>
          )
        })}

        <p className="segment-placement__list-edge">{t('compare.listEnd')}</p>
      </div>
    </section>
  )
}
