import storage from './storage';

const PLAYER_BASE_URL = 'https://vaplayer.ru/embed';
const PROGRESS_PREFIX = 'watch_progress_';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getMovieEmbedUrl(imdbId, resumeAt) {
  let url = `${PLAYER_BASE_URL}/movie/${imdbId}`;
  if (resumeAt) {
    url += `?t=${resumeAt}`;
  }
  return url;
}

export function getTVEmbedUrl(tmdbId, season, episode, resumeAt) {
  let url = `${PLAYER_BASE_URL}/tv/${tmdbId}/${season}/${episode}`;
  if (resumeAt) {
    url += `?t=${resumeAt}`;
  }
  return url;
}

export async function saveWatchProgress(id, time, duration, metadata = {}) {
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
  await storage.setItem(PROGRESS_PREFIX + id, progress);
}

export async function loadWatchProgress(id) {
  const progress = await storage.getItem(PROGRESS_PREFIX + id);
  if (!progress) return null;

  const age = Date.now() - progress.updatedAt;
  if (age > THIRTY_DAYS_MS) {
    await storage.removeItem(PROGRESS_PREFIX + id);
    return null;
  }

  return progress;
}

export async function getAllWatchProgress() {
  const keys = await storage.getAllKeys();
  const progressEntries = [];

  for (const key of keys) {
    if (key.startsWith(PROGRESS_PREFIX)) {
      const progress = await storage.getItem(key);
      if (progress) {
        const age = Date.now() - progress.updatedAt;
        if (age <= THIRTY_DAYS_MS) {
          progressEntries.push(progress);
        } else {
          await storage.removeItem(key);
        }
      }
    }
  }

  return progressEntries.sort((a, b) => b.updatedAt - a.updatedAt);
}
