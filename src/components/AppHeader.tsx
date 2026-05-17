import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeftIcon } from './ChevronLeftIcon'
import { LanguageSelector } from './LanguageSelector'

function getPageTitle(
  pathname: string,
  t: (key: string) => string,
): string | null {
  if (pathname.startsWith('/rank/sort')) return t('rank.titleSort')
  if (pathname.startsWith('/rank/select')) return t('rank.titleSelect')
  if (pathname.startsWith('/rank')) return t('rank.title')
  if (pathname.startsWith('/login')) return t('auth.title')
  return null
}

export function AppHeader() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const pageTitle = getPageTitle(pathname, t)

  return (
    <header className="app-header">
      <div className="app-header__left">
        {isHome ? (
          <span className="app-header__brand">Spoty-Rank</span>
        ) : (
          <Link to="/" className="btn btn--ghost app-header__home">
            <ChevronLeftIcon className="app-header__home-icon" />
            <span>{t('common.home')}</span>
          </Link>
        )}
      </div>

      <div className="app-header__center">
        {pageTitle ? <h1 className="app-header__title">{pageTitle}</h1> : null}
      </div>

      <div className="app-header__right">
        <LanguageSelector compact />
      </div>
    </header>
  )
}
