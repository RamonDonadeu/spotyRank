import { useEffect, useState } from 'react'

import { Trans, useTranslation } from 'react-i18next'

import { Link, useLocation, useNavigate } from 'react-router-dom'

import { RedirectUriDevBanner } from '../components/RedirectUriDevBanner.tsx'
import { translateAuthErrorMessage } from '../i18n/authMessages.ts'
import { useSpotifyLogin } from '../hooks/useSpotifyLogin.ts'
import {
  handleOAuthCallback,
  isOAuthCallbackSearch,
  SpotifyAuthError,
} from '../services/spotifyAuth.ts'

type CallbackState = 'idle' | 'processing' | 'success' | 'error'

function isLoginCallbackPath(pathname: string): boolean {

  return pathname === '/login/callback' || pathname === '/login'

}



export function LoginResponsePage() {

  const { t } = useTranslation()

  const location = useLocation()

  const navigate = useNavigate()

  const { isConfigured, isAuthenticated, isMock, login, logout } = useSpotifyLogin()

  const params = new URLSearchParams(location.search)

  const isOAuthReturn = isOAuthCallbackSearch(params)

  const shouldProcessCallback = isLoginCallbackPath(location.pathname) && isOAuthReturn

  const mockSuffix = isMock ? t('common.mockModeSuffix') : ''



  const [callbackState, setCallbackState] = useState<CallbackState>(

    shouldProcessCallback ? 'processing' : 'idle',

  )

  const [callbackError, setCallbackError] = useState<string | null>(null)



  useEffect(() => {

    if (!shouldProcessCallback) return



    const callbackParams = new URLSearchParams(location.search)

    if (!callbackParams.has('code') && !callbackParams.has('error')) {

      setCallbackState('error')

      setCallbackError(t('auth.noCallbackData'))

      return

    }



    let cancelled = false



    void (async () => {

      try {

        await handleOAuthCallback(callbackParams)

        if (!cancelled) {

          setCallbackState('success')

          navigate('/rank/select', { replace: true, state: { loginSuccess: true } })

        }

      } catch (error) {

        if (!cancelled) {

          setCallbackState('error')

          const message =

            error instanceof SpotifyAuthError

              ? translateAuthErrorMessage(error.message, t)

              : t('auth.loginFailed')

          setCallbackError(message)

        }

      }

    })()



    return () => {

      cancelled = true

    }

  }, [shouldProcessCallback, location.search, navigate, t])



  if (shouldProcessCallback) {

    if (callbackState === 'processing') {

      return (

        <main className="page login-response">

          <h1>{t('auth.title')}</h1>

          <p>{t('auth.completingSignIn')}</p>

        </main>

      )

    }



    if (callbackState === 'success') {

      return (

        <main className="page login-response">

          <h1>{t('auth.title')}</h1>

          <p>{t('auth.connected', { mockSuffix })}</p>

          <p>{t('auth.redirectingToRank')}</p>

        </main>

      )

    }



    return (

      <main className="page login-response">

        <h1>{t('auth.title')}</h1>

        <RedirectUriDevBanner />

        <p className="login-response__error">{callbackError}</p>

        {isConfigured ? (

          <button type="button" className="btn btn--primary" onClick={() => void login()}>

            {t('auth.tryAgain')}

          </button>

        ) : null}

        <Link className="btn btn--ghost" to="/">

          {t('common.backHome')}

        </Link>

      </main>

    )

  }



  if (!isConfigured) {

    return (

      <main className="page login-response">

        <h1>{t('auth.title')}</h1>

        <p>

          <Trans i18nKey="auth.notConfigured" components={{ 1: <code />, 3: <code />, 5: <code />, 7: <code /> }} />

        </p>

        <Link className="btn btn--primary" to="/">

          {t('common.backHome')}

        </Link>

      </main>

    )

  }



  return (

    <main className="page login-response">

      <h1>{t('auth.title')}</h1>

      <RedirectUriDevBanner />

      {isMock ? (

        <p>

          <Trans

            i18nKey="auth.mockModeHint"

            components={{ 1: <strong /> }}

          />

        </p>

      ) : null}

      {isAuthenticated ? (

        <>

          <p>{t('auth.signedIn', { mockSuffix })}</p>

          <div className="home__actions">

            <Link className="btn btn--primary" to="/rank/select">

              {t('auth.startRanking')}

            </Link>

            <button type="button" className="btn btn--ghost" onClick={logout}>

              {t('auth.signOut')}

            </button>

          </div>

        </>

      ) : (

        <>

          <p>{t('auth.connectDescription')}</p>

          <button type="button" className="btn btn--primary" onClick={() => void login()}>

            {t('auth.connectWithSpotify')}

          </button>

        </>

      )}

      <Link className="btn btn--ghost" to="/">

        {t('common.backHome')}

      </Link>

    </main>

  )

}


