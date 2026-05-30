import { GENRE_IDS } from './api';

/**
 * English-normalized genre-name -> TMDB genre ID. Used as a fallback when the
 * translated-name lookup misses (e.g. content that arrives already in English
 * while the UI locale is something else).
 */
const ENGLISH_FALLBACK = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  sciencefiction: 878,
  tvmovie: 10770,
  thriller: 53,
  war: 10752,
  western: 37,
};

/**
 * Resolve a human-readable genre name to its TMDB genre ID.
 *
 * Strategy:
 *   1. Match against the translated genre labels for the active locale
 *      (so "Aksi", "アクション", etc. all resolve correctly).
 *   2. Fall back to an English normalized lookup.
 *
 * @param {string} genreName  Display name of the genre (any locale).
 * @param {Function} [t]      i18n translate function; when provided enables
 *                            locale-aware matching.
 * @returns {number|null}     TMDB genre ID, or null if unresolved.
 */
export function findGenreId(genreName, t) {
  if (!genreName) return null;
  const lower = genreName.toLowerCase().trim();

  if (typeof t === 'function') {
    for (const key of Object.keys(GENRE_IDS)) {
      const translated = t(`genres.${key}`);
      if (translated && translated.toLowerCase() === lower) {
        return GENRE_IDS[key];
      }
    }
  }

  const normalized = lower.replace(/\s+/g, '');
  return ENGLISH_FALLBACK[normalized] || null;
}
