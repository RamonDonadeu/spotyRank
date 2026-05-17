import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import it from './locales/it.json'

export const LANG_STORAGE_KEY = 'spotyrank-lang'

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

function isSupportedLanguage(code: string): code is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code)
}

function detectLanguage(): SupportedLanguage {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY)
      if (stored && isSupportedLanguage(stored)) {
        return stored
      }
    } catch {
      /* private mode or blocked storage */
    }
  }

  const browser =
    typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en'
  if (isSupportedLanguage(browser)) {
    return browser
  }

  return 'en'
}

function setDocumentLang(lng: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
  }
}

const initialLanguage = detectLanguage()
setDocumentLang(initialLanguage)

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (lng) => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lng)
    } catch {
      /* ignore */
    }
  }
  setDocumentLang(lng)
})

export default i18n
