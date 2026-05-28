import { createContext, useContext, useState, useEffect, useCallback } from 'react';

import id from './locales/id.json';
import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import hi from './locales/hi.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

const translations = { id, en, es, pt, hi, ja, ko };

const STORAGE_KEY = 'hijistream_locale';

export const SUPPORTED_LOCALES = [
  { code: 'id', locale: 'id-ID', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', locale: 'en-US', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', locale: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt', locale: 'pt-BR', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'hi', locale: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ja', locale: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', locale: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

const LanguageContext = createContext(null);

function getStoredLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && translations[stored] ? stored : 'id';
  } catch {
    return 'id';
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(getStoredLocale);

  useEffect(() => {
    const handleLanguageChange = () => {
      setLocaleState(getStoredLocale());
    };
    window.addEventListener('language-change', handleLanguageChange);
    return () => window.removeEventListener('language-change', handleLanguageChange);
  }, []);

  const setLocale = useCallback((newLocale) => {
    if (translations[newLocale]) {
      setLocaleState(newLocale);
      try {
        localStorage.setItem(STORAGE_KEY, newLocale);
        window.dispatchEvent(new Event('language-change'));
      } catch {
        // localStorage unavailable
      }
    }
  }, []);

  const t = useCallback((key) => {
    const value = getNestedValue(translations[locale], key);
    if (value !== undefined) return value;
    const fallback = getNestedValue(translations['id'], key) || getNestedValue(translations['en'], key);
    return fallback || key;
  }, [locale]);

  const getApiLocale = useCallback(() => {
    const found = SUPPORTED_LOCALES.find(l => l.code === locale);
    return found ? found.locale : 'id-ID';
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ t, locale, setLocale, getApiLocale, locales: SUPPORTED_LOCALES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation must be used within LanguageProvider');
  return context;
}
