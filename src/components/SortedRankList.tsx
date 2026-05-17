import { useTranslation } from 'react-i18next'
import type { Track } from '../helpers/ranking/types'

interface Props {
  sorted: Track[]
  pending?: Track | null
}

export function SortedRankList({ sorted, pending }: Props) {
  const { t } = useTranslation()

  return (
    <ol className="sorted-rank">
      {sorted.map((track, i) => (
        <li key={track.id}>
          <span className="sorted-rank__num">{i + 1}</span>
          <span className="track-name">{track.name}</span>
          <span className="track-artist">{track.artist}</span>
        </li>
      ))}
      {pending && (
        <li className="sorted-rank__pending" aria-live="polite">
          <span className="sorted-rank__num">…</span>
          <span className="track-name">{pending.name}</span>
          <span className="track-artist">{t('rank.placingNow')}</span>
        </li>
      )}
    </ol>
  )
}
