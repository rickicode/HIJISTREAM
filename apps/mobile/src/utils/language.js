import storage from './storage';

const STORAGE_KEY = 'hijistream_lang';
const SUPPORTED_LANGS = ['en', 'id'];

export async function getCurrentLanguage() {
  const stored = await storage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGS.includes(stored) ? stored : 'en';
}

export async function setLanguage(lang) {
  if (SUPPORTED_LANGS.includes(lang)) {
    await storage.setItem(STORAGE_KEY, lang);
  }
}

export async function getDsLang() {
  const lang = await getCurrentLanguage();
  return lang === 'en' ? null : lang;
}
