import { useCallback, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { hasPlaylistSaveScope } from '../helpers/playlistScopes.ts'

import type { RankedItem } from '../services/apiTypes/rankedItem.ts'

import type { PlaylistSaveResult } from '../services/apiTypes/playlistSave.ts'

import { getAccessToken, isMockMode } from '../services/spotifyAuth.ts'
import { SpotifyApiError } from '../services/spotifyApi.ts'
import {
  InsufficientScopeError,
  saveRankedAsPlaylist,
  type SavePlaylistProgress,
} from '../services/spotifyPlaylist.ts'



export type SaveStatus = 'idle' | 'saving' | 'success' | 'partial' | 'error' | 'auth_required'



export type UseSaveToLibraryResult = {

  status: SaveStatus

  progress: SavePlaylistProgress | null

  result: PlaylistSaveResult | null

  errorMessage: string | null

  save: (playlistName: string) => Promise<void>

  reset: () => void

}



export function useSaveToLibrary(items: readonly RankedItem[]): UseSaveToLibraryResult {

  const { t } = useTranslation()

  const [status, setStatus] = useState<SaveStatus>('idle')

  const [progress, setProgress] = useState<SavePlaylistProgress | null>(null)

  const [result, setResult] = useState<PlaylistSaveResult | null>(null)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)



  const reset = useCallback(() => {

    setStatus('idle')

    setProgress(null)

    setResult(null)

    setErrorMessage(null)

  }, [])



  const save = useCallback(

    async (playlistName: string) => {

      const token = getAccessToken()

      if (!token && !isMockMode()) {

        setStatus('auth_required')

        setErrorMessage(t('library.errors.connectToSave'))

        return

      }



      const trimmedName = playlistName.trim()

      if (!trimmedName) {

        setStatus('error')

        setErrorMessage(t('library.errors.playlistNameRequired'))

        return

      }



      if (!isMockMode() && !hasPlaylistSaveScope()) {

        setStatus('auth_required')

        setErrorMessage(t('library.errors.insufficientScope'))

        return

      }



      setStatus('saving')

      setProgress({ saved: 0, total: items.length })

      setErrorMessage(null)

      setResult(null)



      try {

        const saveResult = await saveRankedAsPlaylist(items, trimmedName, {

          accessToken: token ?? 'mock-token',

          onProgress: setProgress,

        })

        setResult(saveResult)

        if (saveResult.partialFailure) {

          setStatus('partial')

          setErrorMessage(

            t('library.errors.partialBatchFailed', {

              saved: saveResult.savedCount,

              total: saveResult.totalCount,

            }),

          )

        } else {

          setStatus('success')

        }

      } catch (error) {

        if (error instanceof InsufficientScopeError) {
          setStatus('auth_required')
          setErrorMessage(t('library.errors.insufficientScope'))
          return
        }

        if (error instanceof SpotifyApiError && error.status === 403) {
          setStatus('error')
          const lower = error.message.toLowerCase()
          setErrorMessage(
            lower.includes('scope') || lower.includes('permission')
              ? t('library.errors.insufficientScope')
              : t('library.errors.playlistWriteForbidden', { detail: error.message }),
          )
          return
        }

        if (error instanceof Error && error.message === 'No tracks to save') {

          setStatus('error')

          setErrorMessage(t('library.errors.noTracksToSave'))

          return

        }

        setStatus('error')

        setErrorMessage(

          error instanceof Error ? error.message : t('library.errors.saveFailed'),

        )

      }

    },

    [items, t],

  )



  return { status, progress, result, errorMessage, save, reset }

}


