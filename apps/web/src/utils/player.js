import storage from './storage';

const PLAYER_BASE_URL = 'https://vaplayer.ru/embed';
const PROGRESS_PREFIX = 'watch_progress_';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getMovieEmbedUrl(tmdbId, resumeAt, options = {}) {
  const params = new URLSearchParams();
  if (resumeAt) params.set('resumeAt', String(Math.floor(resumeAt)));
  if (options.skin) params.set('skin', options.skin);
  if (options.subUrl) params.set('sub_url', options.subUrl);
  if (options.subLang) params.set('sub_lang', options.subLang);
  if (options.subDefault) params.set('sub_default', 'true');
  const qs = params.toString();
  return `${PLAYER_BASE_URL}/movie/${tmdbId}${qs ? '?' + qs : ''}`;
}

export function getTVEmbedUrl(tmdbId, season, episode, resumeAt, options = {}) {
  let url = `${PLAYER_BASE_URL}/tv/${tmdbId}`;
  if (season && episode) {
    url += `/${season}/${episode}`;
  }
  const params = new URLSearchParams();
  if (resumeAt) params.set('resumeAt', String(Math.floor(resumeAt)));
  if (options.skin) params.set('skin', options.skin);
  if (options.subUrl) params.set('sub_url', options.subUrl);
  if (options.subLang) params.set('sub_lang', options.subLang);
  if (options.subDefault) params.set('sub_default', 'true');
  const qs = params.toString();
  return `${url}${qs ? '?' + qs : ''}`;
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
