import type { Track } from '../helpers/ranking/types'

interface Props {
  tracks: Track[]
  selectedIds: Set<string>
  onToggle: (track: Track) => void
  disabled?: boolean
}

export function TrackList({ tracks, selectedIds, onToggle, disabled }: Props) {
  return (
    <ul className="track-list">
      {tracks.map((track) => {
        const selected = selectedIds.has(track.id)
        return (
          <li key={track.id}>
            <button
              type="button"
              className={`track-row ${selected ? 'track-row--selected' : ''}`}
              onClick={() => onToggle(track)}
              disabled={disabled}
              aria-pressed={selected}
            >
              <span className="track-name">{track.name}</span>
              <span className="track-artist">{track.artist}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
