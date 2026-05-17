import { useTranslation } from 'react-i18next'
import type { Track } from '../../helpers/ranking/types'
import { trackArtGradient, trackArtSrc } from './trackArt'
import './ranking.css'

interface Props {
  track: Track
  role: 'candidate' | 'reference'
  selected?: boolean
  onSelect: () => void
}

export function SongCompareCard({ track, role, selected = false, onSelect }: Props) {
  const { t } = useTranslation()
  const imageUrl = trackArtSrc(track)
  const label = role === 'candidate' ? t('compare.newSong') : t('compare.inRanking')

  return (
    <button
      type="button"
      className={`song-compare-card${selected ? ' song-compare-card--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="song-compare-card__badge">{label}</span>
      <div className="song-compare-card__art-wrap">
        {imageUrl ? (
          <img
            className="song-compare-card__art"
            src={imageUrl}
            alt=""
            width={240}
            height={240}
            loading="lazy"
          />
        ) : (
          <div
            className="song-compare-card__art song-compare-card__art--placeholder"
            style={{ background: trackArtGradient(track.id) }}
            aria-hidden
          />
        )}
      </div>
      <div className="song-compare-card__meta">
        <p className="song-compare-card__title">{track.name}</p>
        <p className="song-compare-card__artist">{track.artist}</p>
      </div>
      <span className="song-compare-card__cta">{t('compare.tapToChoose')}</span>
    </button>
  )
}
