import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RankedItem } from '../services/apiTypes/rankedItem.ts'
import { useSaveToLibrary } from '../hooks/useSaveToLibrary.ts'
import './RankComplete.css'

export type RankCompleteProps = {
  items: readonly RankedItem[]
  /** Called when user must re-authenticate (missing token or scopes). */
  onReconnect?: () => void
}

export function RankComplete({ items, onReconnect }: RankCompleteProps) {
  const { t } = useTranslation()
  const { status, progress, result, errorMessage, save, reset } = useSaveToLibrary(items)

  const defaultPlaylistName = useMemo(
    () => t('library.defaultPlaylistName', { date: new Date().toLocaleDateString() }),
    [t],
  )
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [playlistName, setPlaylistName] = useState(defaultPlaylistName)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const isSaving = status === 'saving'
  const canSave = status === 'idle' || status === 'partial' || status === 'error'
  const itemLabel = t('common.item', { count: items.length })

  useEffect(() => {
    setPlaylistName(defaultPlaylistName)
  }, [defaultPlaylistName])

  useEffect(() => {
    if (!saveDialogOpen) return
    const frame = requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [saveDialogOpen])

  useEffect(() => {
    if (status === 'success') {
      setSaveDialogOpen(false)
    }
  }, [status])

  const openSaveDialog = () => {
    setPlaylistName(defaultPlaylistName)
    setSaveDialogOpen(true)
  }

  const closeSaveDialog = () => {
    if (isSaving) return
    setSaveDialogOpen(false)
  }

  const handleConfirmSave = () => {
    if (!playlistName.trim()) return
    void save(playlistName)
  }

  return (
    <section className="rank-complete" aria-labelledby="rank-complete-heading">
      <header className="rank-complete__header">
        <h2 id="rank-complete-heading">{t('library.rankingComplete')}</h2>
        <p className="rank-complete__subtitle">
          {t('library.finalOrder', { count: items.length, itemLabel })}
        </p>
      </header>

      <div className="rank-complete__scroll">
        <ol className="rank-complete__list">
          {items.map((item, index) => (
            <li key={`${item.type}-${item.id}`} className="rank-complete__row">
              <span className="rank-complete__rank" aria-hidden>
                {index + 1}
              </span>
              {item.imageUrl ? (
                <img className="rank-complete__art" src={item.imageUrl} alt="" width={48} height={48} />
              ) : (
                <span className="rank-complete__art rank-complete__art--placeholder" aria-hidden />
              )}
              <span className="rank-complete__meta">
                <span className="rank-complete__name">{item.name}</span>
                {item.subtitle ? (
                  <span className="rank-complete__subtitle-row">{item.subtitle}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <footer className="rank-complete__footer">
        <div className="rank-complete__actions">
          <button
            type="button"
            className="rank-complete__cta"
            disabled={!canSave || isSaving || items.length === 0}
            onClick={openSaveDialog}
          >
            {t('library.saveAsPlaylist')}
          </button>

          {(status === 'partial' || status === 'error') && (
            <button type="button" className="rank-complete__secondary" onClick={reset}>
              {t('library.dismiss')}
            </button>
          )}
        </div>

        {status === 'success' && result && (
          <div className="rank-complete__status rank-complete__status--success" role="status">
            <p>
              {t('library.playlistSavedSuccess', {
                name: result.playlistName,
                count: result.savedCount,
                itemLabel: t('common.item', { count: result.savedCount }),
              })}
            </p>
            {result.playlistUrl ? (
              <a
                className="rank-complete__playlist-link"
                href={result.playlistUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('library.openInSpotify')}
              </a>
            ) : null}
          </div>
        )}

        {status === 'partial' && result && (
          <p className="rank-complete__status rank-complete__status--warn" role="alert">
            {t('library.partialSaved', { saved: result.savedCount, total: result.totalCount })}
          </p>
        )}

        {(status === 'auth_required' || status === 'error') && errorMessage && (
          <div className="rank-complete__status rank-complete__status--error" role="alert">
            <p>{errorMessage}</p>
            {status === 'auth_required' && onReconnect && (
              <button type="button" className="rank-complete__link" onClick={onReconnect}>
                {t('library.reconnectSpotify')}
              </button>
            )}
          </div>
        )}
      </footer>

      {saveDialogOpen ? (
        <div
          className="rank-complete__dialog-overlay"
          role="presentation"
          onClick={closeSaveDialog}
        >
          <div
            className="rank-complete__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rank-complete-save-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="rank-complete-save-dialog-title" className="rank-complete__dialog-title">
              {t('library.savePlaylistDialogTitle')}
            </h3>
            <p className="rank-complete__playlist-hint">{t('library.playlistHint')}</p>

            <label className="rank-complete__playlist-label" htmlFor="rank-complete-playlist-name">
              {t('library.playlistNameLabel')}
            </label>
            <input
              ref={nameInputRef}
              id="rank-complete-playlist-name"
              type="text"
              className="rank-complete__playlist-input"
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleConfirmSave()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  closeSaveDialog()
                }
              }}
              maxLength={100}
              disabled={isSaving}
              placeholder={t('library.playlistNamePlaceholder')}
            />

            {isSaving && progress ? (
              <p className="rank-complete__status" role="status">
                {t('library.savingProgress', { saved: progress.saved, total: progress.total })}
              </p>
            ) : null}

            <div className="rank-complete__dialog-actions">
              <button
                type="button"
                className="rank-complete__secondary"
                disabled={isSaving}
                onClick={closeSaveDialog}
              >
                {t('library.cancel')}
              </button>
              <button
                type="button"
                className="rank-complete__cta"
                disabled={isSaving || !playlistName.trim() || items.length === 0}
                onClick={handleConfirmSave}
              >
                {isSaving && progress
                  ? t('library.savingProgress', { saved: progress.saved, total: progress.total })
                  : t('library.saveAsPlaylist')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
