import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatRankingDuration } from '../helpers/ranking/formatRankingDuration'

interface Props {
  seconds: number
  variant: 'total' | 'remaining'
}

export function RankingTimeBanner({ seconds, variant }: Props) {
  const { t } = useTranslation()
  const duration = useMemo(() => formatRankingDuration(seconds, t), [seconds, t])

  if (seconds <= 0) return null

  const messageKey =
    variant === 'total' ? 'rank.estimatedTimeTotal' : 'rank.estimatedTimeRemaining'

  return (
    <aside className="banner banner--info" role="status">
      {t(messageKey, { estimatedTime: duration })}
    </aside>
  )
}
