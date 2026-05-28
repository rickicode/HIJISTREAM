import storage from './storage';
import { getDsLang } from './language';

const PLAYER_BASE_URL = 'https://vaplayer.ru/embed';
const PROGRESS_PREFIX = 'watch_progress_';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getMovieEmbedUrl(imdbId, resumeAt) {
  const params = new URLSearchParams();
  params.set('skin', 'netflix');
  if (resumeAt) params.set('resumeAt', String(Math.floor(resumeAt)));
  const dsLang = getDsLang();
  if (dsLang) params.set('ds_lang', dsLang);
  return `${PLAYER_BASE_URL}/movie/${imdbId}?${params.toString()}`;
}

export function getTVEmbedUrl(tmdbId, season, episode, resumeAt) {
  const params = new URLSearchParams();
  params.set('skin', 'netflix');
  if (resumeAt) params.set('resumeAt', String(Math.floor(resumeAt)));
  const dsLang = getDsLang();
  if (dsLang) params.set('ds_lang', dsLang);
  return `${PLAYER_BASE_URL}/tv/${tmdbId}/${season}/${episode}?${params.toString()}`;
}

export function saveWatchProgress(id, time, duration, metadata = {}) {
  const progress = {
    id,
    time,
    duration,
    percentage: duration > 0 ? Math.round((time / duration) * 100) : 0,
    updatedAt: Date.now(),
    title: metadata.title || '',
    poster_url: metadata.poster_url || '',
    type: metadata.type || 'movie',
  };
  storage.setItem(PROGRESS_PREFIX + id, progress);
}

export function loadWatchProgress(id) {
  const progress = storage.getItem(PROGRESS_PREFIX + id);
  if (!progress) return null;

  const age = Date.now() - progress.updatedAt;
  if (age > THIRTY_DAYS_MS) {
    storage.removeItem(PROGRESS_PREFIX + id);
    return null;
  }

  return progress;
}

export function getAllWatchProgress() {
  const keys = storage.getAllKeys();
  const progressEntries = [];

  keys.forEach((key) => {
    if (key.startsWith(PROGRESS_PREFIX)) {
      const progress = storage.getItem(key);
      if (progress) {
        const age = Date.now() - progress.updatedAt;
        if (age <= THIRTY_DAYS_MS) {
          progressEntries.push(progress);
        } else {
          storage.removeItem(key);
        }
      }
    }
  });

  return progressEntries.sort((a, b) => b.updatedAt - a.updatedAt);
}
