import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  formatRankingDurationRange,
} from '../helpers/ranking/formatRankingDuration'
import type { TimeEstimateRange } from '../helpers/ranking/rankingTimeEstimate'

interface Props {
  totalTime?: TimeEstimateRange
  remainingTime?: TimeEstimateRange
  largeList?: { count: number; threshold: number }
}

const EMPTY_RANGE: TimeEstimateRange = { minSeconds: 0, maxSeconds: 0 }

function hasTimeRange(range: TimeEstimateRange): boolean {
  return range.maxSeconds > 0
}

export function RankingTimeInfo({
  totalTime = EMPTY_RANGE,
  remainingTime = EMPTY_RANGE,
  largeList,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()

  const totalLabel = useMemo(
    () =>
      hasTimeRange(totalTime)
        ? formatRankingDurationRange(totalTime.minSeconds, totalTime.maxSeconds, t)
        : null,
    [totalTime, t],
  )
  const remainingLabel = useMemo(
    () =>
      hasTimeRange(remainingTime)
        ? formatRankingDurationRange(remainingTime.minSeconds, remainingTime.maxSeconds, t)
        : null,
    [remainingTime, t],
  )

  const hasContent = Boolean(largeList || totalLabel || remainingLabel)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!hasContent) return null

  return (
    <div className="ranking-time-info" ref={rootRef}>
      <button
        type="button"
        className="ranking-time-info__trigger"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={t('rank.timeInfoLabel')}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="ranking-time-info__icon" aria-hidden>
          i
        </span>
        {remainingLabel ? (
          <span className="ranking-time-info__hint">{remainingLabel}</span>
        ) : totalLabel ? (
          <span className="ranking-time-info__hint">{totalLabel}</span>
        ) : null}
      </button>
      {open ? (
        <div
          id={popoverId}
          className="ranking-time-info__popover"
          role="dialog"
          aria-label={t('rank.timeInfoLabel')}
        >
          <p className="ranking-time-info__line ranking-time-info__line--muted">
            {t('rank.timePerDecision')}
          </p>
          {largeList ? (
            <p className="ranking-time-info__line ranking-time-info__line--warn">
              {t('rank.timeInfoLargeList', {
                count: largeList.count,
                threshold: largeList.threshold,
              })}
            </p>
          ) : null}
          {totalLabel ? (
            <p className="ranking-time-info__line">
              {t('rank.estimatedTimeTotal', { estimatedTime: totalLabel })}
            </p>
          ) : null}
          {remainingLabel ? (
            <p className="ranking-time-info__line">
              {t('rank.estimatedTimeRemaining', { estimatedTime: remainingLabel })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
