import { useTranslation } from 'react-i18next'
import type { SupportedLanguage } from '../i18n/index.ts'
import { SUPPORTED_LANGUAGES } from '../i18n/index.ts'

const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
]

type LanguageSelectorProps = {
  compact?: boolean
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation()
  const current = SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
    ? (i18n.language as SupportedLanguage)
    : 'en'

  return (
    <label
      className={`language-selector${compact ? ' language-selector--compact' : ''}`}
    >
      {!compact ? (
        <span className="language-selector__label">{t('common.languageLabel')}</span>
      ) : null}
      <select
        className="language-selector__select"
        value={current}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        aria-label={t('common.languageLabel')}
      >
        {LANGUAGE_OPTIONS.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}
