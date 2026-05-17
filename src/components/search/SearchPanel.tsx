import { useCallback, useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { SpotifyUserBadge } from '../SpotifyUserBadge.tsx'

import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts'

import { useSpotifyLogin } from '../../hooks/useSpotifyLogin.ts'
import { useSpotifyUser } from '../../hooks/useSpotifyUser.ts'

import type { Track } from '../../helpers/ranking/types.ts'

import { SpotifyApiError } from '../../services/spotifyApi.ts'

import { getAccessToken } from '../../services/spotifyAuth.ts'

import {

  fetchAlbumTracksAsRankTracks,

  fetchAllArtistTracksAsRankTracks,

  searchSpotify,

  type SearchResult,

  type SpotifySearchType,

} from '../../services/spotifySearch.ts'



const SEARCH_DEBOUNCE_MS = 300

const SEARCH_LIMIT = 10

const SEARCH_MIN_LENGTH = 2



type Props = {

  selectedIds: ReadonlySet<string>

  onAddTracks: (tracks: Track[]) => void

  onSessionExpired: () => void

  onReconnect: () => void

}



export function SearchPanel({

  selectedIds,

  onAddTracks,

  onSessionExpired,

  onReconnect,

}: Props) {

  const { t } = useTranslation()

  const { isAuthenticated } = useSpotifyLogin()
  const userState = useSpotifyUser()

  const [query, setQuery] = useState('')

  const [searchType, setSearchType] = useState<SpotifySearchType>('track')

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)

  const [results, setResults] = useState<SearchResult[]>([])

  const [loading, setLoading] = useState(false)

  const [expandingId, setExpandingId] = useState<string | null>(null)
  const [expandProgress, setExpandProgress] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  const [showReconnectLink, setShowReconnectLink] = useState(false)



  const canSearch = isAuthenticated && userState.status !== 'expired'

  const trimmedQuery = debouncedQuery.trim()

  const queryTooShort =

    trimmedQuery.length > 0 && trimmedQuery.length < SEARCH_MIN_LENGTH



  const handleApiError = useCallback(

    (err: unknown) => {

      if (err instanceof SpotifyApiError && err.status === 401) {

        onSessionExpired()

        setError(t('search.errors.sessionExpired'))

        setShowReconnectLink(true)

        return

      }

      setShowReconnectLink(false)

      if (err instanceof SpotifyApiError && err.status >= 500) {

        setError(t('search.errors.network'))

        return

      }

      setError(err instanceof Error ? err.message : t('search.errors.searchFailed'))

    },

    [onSessionExpired, t],

  )



  useEffect(() => {

    const token = getAccessToken()

    if (!token || !canSearch || trimmedQuery.length < SEARCH_MIN_LENGTH) {

      setResults([])

      setLoading(false)

      if (!token || !canSearch) {

        setError(null)

        setShowReconnectLink(false)

      }

      return

    }



    let cancelled = false

    setLoading(true)

    setError(null)

    setShowReconnectLink(false)



    void (async () => {

      try {

        const items = await searchSpotify(trimmedQuery, searchType, SEARCH_LIMIT, token)

        if (!cancelled) {

          setResults(items)

        }

      } catch (err) {

        if (!cancelled) {

          setResults([])

          handleApiError(err)

        }

      } finally {

        if (!cancelled) {

          setLoading(false)

        }

      }

    })()



    return () => {

      cancelled = true

    }

  }, [trimmedQuery, searchType, handleApiError, canSearch])



  const addTracks = useCallback(

    (tracks: Track[]) => {

      const fresh = tracks.filter((track) => !selectedIds.has(track.id))

      if (fresh.length > 0) {

        onAddTracks(fresh)

      }

    },

    [onAddTracks, selectedIds],

  )



  const handleSelectResult = useCallback(

    async (result: SearchResult) => {

      const token = getAccessToken()

      if (!token || !canSearch) {

        onSessionExpired()

        return

      }



      if (result.type === 'track') {

        addTracks([
          {
            id: result.id,
            name: result.name,
            artist: result.subtitle,
            imageUrl: result.imageUrl,
            albumId: result.albumId,
            albumName: result.albumName,
          },
        ])

        return

      }



      setExpandingId(result.id)
      setExpandProgress(null)

      setError(null)

      try {

        if (result.type === 'album') {

          const tracks = await fetchAlbumTracksAsRankTracks(result.id, token, undefined, {
            name: result.name,
            imageUrl: result.imageUrl,
          })

          addTracks(tracks)

        } else {

          const tracks = await fetchAllArtistTracksAsRankTracks(
            result.id,
            result.name,
            token,
            undefined,
            (progress) => {
              if (progress.albumTotal > 0) {
                setExpandProgress(
                  t('search.loadingArtistAlbums', {
                    current: progress.albumsLoaded,
                    total: progress.albumTotal,
                    tracks: progress.tracksCollected,
                  }),
                )
              } else {
                setExpandProgress(
                  t('search.loadingArtistSearch', { tracks: progress.tracksCollected }),
                )
              }
            },
          )

          if (tracks.length === 0) {
            setError(t('search.errors.artistNoTracks'))
          } else {
            addTracks(tracks)
          }

        }

      } catch (err) {

        handleApiError(err)

      } finally {
        setExpandingId(null)
        setExpandProgress(null)
      }

    },

    [addTracks, canSearch, handleApiError, onSessionExpired],

  )



  const showEmpty =

    trimmedQuery.length >= SEARCH_MIN_LENGTH && !loading && results.length === 0 && !error



  return (

    <div className="search-panel">

      <SpotifyUserBadge showStatus onReconnect={onReconnect} onConnect={onReconnect} />



      <label className="search-panel__label" htmlFor="spotify-search">

        {t('search.placeholder')}

      </label>

      <input

        id="spotify-search"

        className="search-panel__input"

        type="search"

        value={query}

        onChange={(e) => setQuery(e.target.value)}

        placeholder={t('search.inputPlaceholder')}

        autoComplete="off"

        disabled={!canSearch}

        aria-describedby="spotify-search-hint"

      />



      <p id="spotify-search-hint" className="search-panel__hint">
        {!isAuthenticated
          ? t('search.errors.needLogin')
          : userState.status === 'expired'
            ? t('search.errors.sessionExpired')
            : queryTooShort
              ? t('search.minLengthHint', { count: SEARCH_MIN_LENGTH })
              : t('search.hint')}
      </p>



      <div className="search-panel__tabs" role="tablist" aria-label={t('search.filterLabel')}>

        {(['track', 'album', 'artist'] as const).map((type) => (

          <button

            key={type}

            type="button"

            role="tab"

            aria-selected={searchType === type}

            className={`search-panel__tab${searchType === type ? ' search-panel__tab--active' : ''}`}

            onClick={() => setSearchType(type)}

            disabled={!canSearch}

          >

            {t(`search.types.${type}`)}

          </button>

        ))}

      </div>



      {loading ? (

        <p className="search-panel__status search-panel__status--loading" role="status" aria-live="polite">

          <span className="spinner spinner--sm" aria-hidden />

          {t('search.loading')}

        </p>

      ) : null}

      {expandProgress ? (
        <p className="search-panel__status search-panel__status--loading" role="status" aria-live="polite">
          <span className="spinner spinner--sm" aria-hidden />
          {expandProgress}
        </p>
      ) : null}

      {error ? (

        <p className="search-panel__status search-panel__status--error" role="alert">

          {error}

          {showReconnectLink ? (

            <>

              {' '}

              <button type="button" className="search-panel__reconnect" onClick={onReconnect}>

                {t('library.reconnectSpotify')}

              </button>

            </>

          ) : null}

        </p>

      ) : null}

      {showEmpty ? <p className="search-panel__status">{t('search.noResults')}</p> : null}



      <ul className="search-results">

        {results.map((result) => {

          const alreadySelected = selectedIds.has(result.id)

          const isExpanding = expandingId === result.id

          return (

            <li key={`${result.type}-${result.id}`}>

              <button

                type="button"

                className="search-result"

                disabled={isExpanding || !canSearch}

                onClick={() => void handleSelectResult(result)}

              >

                {result.imageUrl ? (

                  <img

                    className="search-result__art"

                    src={result.imageUrl}

                    alt=""

                    width={40}

                    height={40}

                  />

                ) : (

                  <span className="search-result__art search-result__art--placeholder" aria-hidden />

                )}

                <span className="search-result__meta">

                  <span className="search-result__name">{result.name}</span>

                  {result.subtitle ? (

                    <span className="search-result__subtitle">{result.subtitle}</span>

                  ) : null}

                  <span className="search-result__type">{t(`search.types.${result.type}`)}</span>

                </span>

                <span className="search-result__action">

                  {isExpanding

                    ? t('search.adding')

                    : alreadySelected && result.type === 'track'

                      ? t('search.added')

                      : t('search.add')}

                </span>

              </button>

            </li>

          )

        })}

      </ul>

    </div>

  )

}


