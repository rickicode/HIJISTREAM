import storage from './storage';

const KEY = '@myList:items';

let cachedItems = null;
let loadPromise = null;
const subscribers = new Set();

function makeKey(item, fallbackType) {
  if (!item) return '';
  const id = item.id || item.tmdb_id;
  const type = item.type || item._detectedType || fallbackType || 'movie';
  return `${type}:${id}`;
}

function notify() {
  subscribers.forEach((cb) => cb());
}

async function ensureLoaded() {
  if (cachedItems !== null) return cachedItems;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const stored = await storage.getItem(KEY);
    cachedItems = Array.isArray(stored) ? stored : [];
    loadPromise = null;
    return cachedItems;
  })();
  return loadPromise;
}

async function persist() {
  await storage.setItem(KEY, cachedItems || []);
}

async function getAll() {
  return await ensureLoaded();
}

async function isInList(item, fallbackType) {
  if (!item) return false;
  const list = await ensureLoaded();
  const key = makeKey(item, fallbackType);
  return list.some((entry) => makeKey(entry, entry.type) === key);
}

async function add(item, fallbackType) {
  if (!item) return;
  const list = await ensureLoaded();
  const itemType = item.type || item._detectedType || fallbackType || 'movie';
  const key = makeKey(item, fallbackType);
  if (list.some((entry) => makeKey(entry, entry.type) === key)) {
    return list;
  }
  const newItem = {
    id: item.id || item.tmdb_id,
    tmdb_id: item.tmdb_id || item.id,
    type: itemType,
    title: item.title,
    poster_url: item.poster_url || null,
    backdrop_url: item.backdrop_url || null,
    year: item.year || null,
    rating: item.rating || null,
    genre: item.genre || null,
    addedAt: Date.now(),
  };
  cachedItems = [newItem, ...list];
  await persist();
  notify();
  return cachedItems;
}

async function remove(item, fallbackType) {
  if (!item) return;
  const list = await ensureLoaded();
  const key = makeKey(item, fallbackType);
  cachedItems = list.filter((entry) => makeKey(entry, entry.type) !== key);
  await persist();
  notify();
  return cachedItems;
}

async function toggle(item, fallbackType) {
  const inList = await isInList(item, fallbackType);
  if (inList) {
    await remove(item, fallbackType);
    return false;
  }
  await add(item, fallbackType);
  return true;
}

function subscribe(cb) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export default { getAll, isInList, add, remove, toggle, subscribe };
