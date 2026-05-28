import storage from './storage';

const STORAGE_KEY = 'hijistream_locale';
const SUPPORTED_LANGS = ['id', 'en', 'es', 'pt', 'hi', 'ja', 'ko'];

export async function getCurrentLanguage() {
  const stored = await storage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGS.includes(stored) ? stored : 'id';
}

export async function setLanguage(lang) {
  if (SUPPORTED_LANGS.includes(lang)) {
    await storage.setItem(STORAGE_KEY, lang);
  }
}

export function getApiLanguageParam(langCode) {
  const localeMap = { id: 'id-ID', en: 'en-US', es: 'es-ES', pt: 'pt-BR', hi: 'hi-IN', ja: 'ja-JP', ko: 'ko-KR' };
  return localeMap[langCode] || 'id-ID';
}

export async function getDsLang() {
  const lang = await getCurrentLanguage();
  return lang === 'en' ? null : lang;
}
