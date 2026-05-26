import storage from './storage';

export const TTL = {
  CONTENT_LIST: 86400,
  CONTENT_DETAIL: 604800,
  IMAGES: 2592000,
  SEARCH: 3600,
};

const CACHE_PREFIX = 'cache_';

class CacheManager {
  get(key) {
    const entry = storage.getItem(CACHE_PREFIX + key);
    if (!entry) return null;

    const now = Math.floor(Date.now() / 1000);
    if (now > entry.expiresAt) {
      storage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  }

  set(key, data, ttl) {
    const now = Math.floor(Date.now() / 1000);
    const entry = {
      key,
      data,
      timestamp: now,
      ttl,
      expiresAt: now + ttl,
    };
    storage.setItem(CACHE_PREFIX + key, entry);
  }

  clear() {
    const keys = storage.getAllKeys();
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        storage.removeItem(key);
      }
    });
  }

  cleanup() {
    const now = Math.floor(Date.now() / 1000);
    const keys = storage.getAllKeys();
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        const entry = storage.getItem(key);
        if (entry && now > entry.expiresAt) {
          storage.removeItem(key);
        }
      }
    });
  }
}

const cacheManager = new CacheManager();
export default cacheManager;
