import storage from './storage';

export const TTL = {
  CONTENT_LIST: 86400,
  CONTENT_DETAIL: 604800,
  IMAGES: 2592000,
  SEARCH: 3600,
};

const CACHE_PREFIX = 'cache_';

class CacheManager {
  async get(key) {
    const entry = await storage.getItem(CACHE_PREFIX + key);
    if (!entry) return null;

    const now = Math.floor(Date.now() / 1000);
    if (now > entry.expiresAt) {
      await storage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  }

  async set(key, data, ttl) {
    const now = Math.floor(Date.now() / 1000);
    const entry = {
      key,
      data,
      timestamp: now,
      ttl,
      expiresAt: now + ttl,
    };
    await storage.setItem(CACHE_PREFIX + key, entry);
  }

  async clear() {
    const keys = await storage.getAllKeys();
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        await storage.removeItem(key);
      }
    }
  }

  async cleanup() {
    const now = Math.floor(Date.now() / 1000);
    const keys = await storage.getAllKeys();
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        const entry = await storage.getItem(key);
        if (entry && now > entry.expiresAt) {
          await storage.removeItem(key);
        }
      }
    }
  }
}

const cacheManager = new CacheManager();
export default cacheManager;
