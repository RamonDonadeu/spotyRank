import { useTranslation } from 'react-i18next'

import { useSpotifyLogin } from '../hooks/useSpotifyLogin.ts'

import { useSpotifyUser } from '../hooks/useSpotifyUser.ts'

import { pickUserAvatarUrl } from '../services/spotifyUser.ts'



type Props = {

  onConnect?: () => void

  onReconnect?: () => void

  showConnectWhenAnonymous?: boolean

  /** Always show session state (e.g. on rank/search). */

  showStatus?: boolean

}



export function SpotifyUserBadge({

  onConnect,

  onReconnect,

  showConnectWhenAnonymous = false,

  showStatus = false,

}: Props) {

  const { t } = useTranslation()

  const { isAuthenticated } = useSpotifyLogin()

  const userState = useSpotifyUser()



  if (!isAuthenticated) {

    if (!showStatus && !showConnectWhenAnonymous) return null

    if (showConnectWhenAnonymous && onConnect) {

      return (

        <div className="spotify-user-badge spotify-user-badge--anonymous" role="status">

          <p className="spotify-user-badge__text">{t('auth.connectDescription')}</p>

          <button type="button" className="btn btn--primary" onClick={onConnect}>

            {t('home.connectSpotify')}

          </button>

        </div>

      )

    }

    return (

      <div className="spotify-user-badge spotify-user-badge--anonymous" role="status">

        <span>{t('auth.noToken')}</span>

        {onConnect ? (

          <button type="button" className="btn btn--ghost spotify-user-badge__action" onClick={onConnect}>

            {t('home.connectSpotify')}

          </button>

        ) : null}

      </div>

    )

  }



  if (userState.status === 'loading') {

    return (

      <div className="spotify-user-badge spotify-user-badge--loading" role="status" aria-busy="true">

        <span className="spinner spinner--sm" aria-hidden />

        <span>{t('auth.checkingSession')}</span>

      </div>

    )

  }



  if (userState.status === 'expired') {

    return (

      <div className="spotify-user-badge spotify-user-badge--expired" role="alert">

        <span className="spotify-user-badge__icon spotify-user-badge__icon--warn" aria-hidden>

          !

        </span>

        <span>{t('auth.loginFailedReason', { reason: t('auth.sessionExpired') })}</span>

        {onReconnect ? (

          <button type="button" className="btn btn--ghost spotify-user-badge__action" onClick={onReconnect}>

            {t('library.reconnectSpotify')}

          </button>

        ) : null}

      </div>

    )

  }



  if (userState.status === 'error') {

    return (

      <div className="spotify-user-badge spotify-user-badge--expired" role="alert">

        <span>{t('auth.loginFailedReason', { reason: userState.message })}</span>

        {onReconnect ? (

          <button type="button" className="btn btn--ghost spotify-user-badge__action" onClick={onReconnect}>

            {t('library.reconnectSpotify')}

          </button>

        ) : null}

      </div>

    )

  }



  if (userState.status === 'anonymous') {

    return (

      <div className="spotify-user-badge spotify-user-badge--loading" role="status" aria-busy="true">

        <span className="spinner spinner--sm" aria-hidden />

        <span>{t('auth.checkingSession')}</span>

      </div>

    )

  }



  const avatarUrl = pickUserAvatarUrl(userState.profile.images)

  const displayName = userState.profile.display_name || userState.profile.id



  return (

    <div className="spotify-user-badge spotify-user-badge--ok" role="status">

      <span className="spotify-user-badge__icon spotify-user-badge__icon--ok" aria-hidden>

        ✓

      </span>

      {avatarUrl ? (

        <img className="spotify-user-badge__avatar" src={avatarUrl} alt="" width={28} height={28} />

      ) : null}

      <span>

        {t('auth.loggedInAs', { name: displayName })}

        {userState.isMock ? ` ${t('common.mockMode')}` : ''}

      </span>

    </div>

  )

}


