import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatRankingDuration } from '../helpers/ranking/formatRankingDuration'

interface Props {
  count: number
  threshold: number
  estimatedSeconds: number
}

export function LargeListWarning({ count, threshold, estimatedSeconds }: Props) {
  const { t } = useTranslation()
  const estimatedTime = useMemo(
    () => formatRankingDuration(estimatedSeconds, t),
    [estimatedSeconds, t],
  )

  return (
    <aside className="banner banner--warn" role="status">
      <p>{t('rank.largeListWarning', { count, threshold })}</p>
      <p className="banner__detail">
        {t('rank.estimatedTimeTotal', { estimatedTime })}
      </p>
    </aside>
  )
}
