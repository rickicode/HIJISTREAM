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
  // Always return the user's selected locale (ISO 639-1) so the embed
  // player can preselect subtitle language and auto-search OpenSubtitles
  // for matching subs. Returning null for English would skip the param
  // entirely, leaving the player without a language preference.
  return await getCurrentLanguage();
}
