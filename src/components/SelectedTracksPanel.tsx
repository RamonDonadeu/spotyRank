import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  groupTracksByAlbum,
  UNKNOWN_ALBUM_ID,
} from '../helpers/groupTracksByAlbum.ts'
import type { Track } from '../helpers/ranking/types.ts'

type ViewMode = 'list' | 'album'

type Props = {
  tracks: Track[]
  onRemoveTrack: (trackId: string) => void
  onRemoveAlbum: (albumId: string) => void
}

export function SelectedTracksPanel({ tracks, onRemoveTrack, onRemoveAlbum }: Props) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [collapsedAlbums, setCollapsedAlbums] = useState<Set<string>>(() => new Set())
  const albumGroups = useMemo(() => groupTracksByAlbum(tracks), [tracks])

  const toggleAlbumCollapsed = useCallback((albumId: string) => {
    setCollapsedAlbums((prev) => {
      const next = new Set(prev)
      if (next.has(albumId)) next.delete(albumId)
      else next.add(albumId)
      return next
    })
  }, [])

  const expandAllAlbums = useCallback(() => {
    setCollapsedAlbums(new Set())
  }, [])

  const collapseAllAlbums = useCallback(() => {
    setCollapsedAlbums(new Set(albumGroups.map((g) => g.albumId)))
  }, [albumGroups])

  return (
    <div className="selected-tracks">
      <div className="selected-tracks__toolbar" role="toolbar" aria-label={t('rank.viewModeLabel')}>
        <button
          type="button"
          className={`selected-tracks__view-btn${viewMode === 'list' ? ' selected-tracks__view-btn--active' : ''}`}
          onClick={() => setViewMode('list')}
          aria-pressed={viewMode === 'list'}
        >
          {t('rank.viewList')}
        </button>
        <button
          type="button"
          className={`selected-tracks__view-btn${viewMode === 'album' ? ' selected-tracks__view-btn--active' : ''}`}
          onClick={() => setViewMode('album')}
          aria-pressed={viewMode === 'album'}
        >
          {t('rank.viewByAlbum')}
        </button>
      </div>

      {viewMode === 'album' && albumGroups.length > 0 ? (
        <div className="selected-tracks__album-actions">
          <button type="button" className="selected-tracks__bulk-btn" onClick={expandAllAlbums}>
            {t('rank.expandAllAlbums')}
          </button>
          <button type="button" className="selected-tracks__bulk-btn" onClick={collapseAllAlbums}>
            {t('rank.collapseAllAlbums')}
          </button>
        </div>
      ) : null}

      <div className="selected-tracks__body">
      {viewMode === 'list' ? (
        <ul className="track-list selected-tracks__list">
          {tracks.map((track) => (
            <li key={track.id} className="selected-tracks__row">
              <div className="selected-tracks__info">
                <span className="track-name">{track.name}</span>
                <span className="track-artist">{track.artist}</span>
                {track.albumName ? (
                  <span className="selected-tracks__album-label">{track.albumName}</span>
                ) : null}
              </div>
              <button
                type="button"
                className="selected-tracks__remove"
                onClick={() => onRemoveTrack(track.id)}
                aria-label={t('rank.removeTrack', { name: track.name })}
              >
                {t('rank.remove')}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="selected-tracks__albums">
          {albumGroups.map((group) => {
            const displayName =
              group.albumId === UNKNOWN_ALBUM_ID
                ? t('rank.unknownAlbum')
                : group.albumName || t('rank.unknownAlbum')
            const isCollapsed = collapsedAlbums.has(group.albumId)
            return (
              <li
                key={group.albumId}
                className={`selected-tracks__album-group${isCollapsed ? ' selected-tracks__album-group--collapsed' : ''}`}
              >
                <div className="selected-tracks__album-header">
                  <button
                    type="button"
                    className="selected-tracks__album-toggle"
                    onClick={() => toggleAlbumCollapsed(group.albumId)}
                    aria-expanded={!isCollapsed}
                    aria-controls={`album-tracks-${group.albumId}`}
                  >
                    <span className="selected-tracks__chevron" aria-hidden />
                    {group.imageUrl ? (
                      <img
                        className="selected-tracks__album-art"
                        src={group.imageUrl}
                        alt=""
                        width={40}
                        height={40}
                      />
                    ) : (
                      <span className="selected-tracks__album-art selected-tracks__album-art--placeholder" />
                    )}
                    <span className="selected-tracks__album-meta">
                      <span className="selected-tracks__album-name">{displayName}</span>
                      <span className="selected-tracks__album-count">
                        {t('rank.trackCount', { count: group.tracks.length })}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="selected-tracks__remove-album"
                    onClick={() => onRemoveAlbum(group.albumId)}
                  >
                    {t('rank.removeAlbum')}
                  </button>
                </div>
                <ul
                  id={`album-tracks-${group.albumId}`}
                  className="selected-tracks__album-tracks"
                  hidden={isCollapsed}
                >
                  {group.tracks.map((track) => (
                    <li key={track.id} className="selected-tracks__row selected-tracks__row--nested">
                      <div className="selected-tracks__info">
                        <span className="track-name">{track.name}</span>
                        <span className="track-artist">{track.artist}</span>
                      </div>
                      <button
                        type="button"
                        className="selected-tracks__remove"
                        onClick={() => onRemoveTrack(track.id)}
                        aria-label={t('rank.removeTrack', { name: track.name })}
                      >
                        {t('rank.remove')}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
      </div>
    </div>
  )
}

