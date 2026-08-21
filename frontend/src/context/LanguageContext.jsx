import { createContext, useContext, useState } from 'react'
import { translations } from '../i18n/translations'

const LanguageContext = createContext()

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
]

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('lifelink_language') || 'en'
  })

  const setLanguage = (lang) => {
    setLanguageState(lang)
    localStorage.setItem('lifelink_language', lang)
  }

  // Translation lookup function
  const t = (key, fallback) => {
    const langDict = translations[language] || translations.en
    if (langDict && langDict[key]) {
      return langDict[key]
    }
    if (translations.en && translations.en[key]) {
      return translations.en[key]
    }
    return fallback || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    // Fallback if rendered outside LanguageProvider
    return {
      language: 'en',
      setLanguage: () => {},
      t: (k, f) => translations.en[k] || f || k,
      languages: LANGUAGES,
    }
  }
  return context
}
