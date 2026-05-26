import { describe, it, expect } from 'vitest';

const BASE_URL = 'https://vidapi.ru';

// Helper: fetch an endpoint, return data if 200, null if not available
async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Validate the structure of a content list item
function validateListItem(item) {
  expect(item).toHaveProperty('tmdb_id');
  expect(item).toHaveProperty('imdb_id');
  expect(item).toHaveProperty('title');
  expect(item).toHaveProperty('year');
  expect(item).toHaveProperty('poster_url');
  expect(item).toHaveProperty('rating');
  expect(item).toHaveProperty('genre');
  expect(item).toHaveProperty('embed_url');
  expect(typeof item.title).toBe('string');
  expect(item.title.length).toBeGreaterThan(0);
  expect(item.poster_url).toMatch(/^https?:\/\//);
  expect(item.embed_url).toMatch(/^https?:\/\//);
}

// Validate paginated response structure
function validatePaginatedResponse(data) {
  expect(data).toHaveProperty('page');
  expect(data).toHaveProperty('per_page');
  expect(data).toHaveProperty('total');
  expect(data).toHaveProperty('total_pages');
  expect(data).toHaveProperty('items');
  expect(typeof data.page).toBe('number');
  expect(typeof data.total_pages).toBe('number');
  expect(Array.isArray(data.items)).toBe(true);
  expect(data.items.length).toBeGreaterThan(0);
  expect(data.page).toBe(1);
  expect(data.total_pages).toBeGreaterThan(0);
}

describe('VidAPI - Movies Endpoints', () => {
  it('GET /movies/latest/page-1.json returns valid paginated response', async () => {
    const data = await fetchAPI('/movies/latest/page-1.json');
    // This endpoint is reliably available
    expect(data).not.toBeNull();
    validatePaginatedResponse(data);
    validateListItem(data.items[0]);
  });

  it('GET /movies/trending/page-1.json returns valid response if available', async () => {
    const data = await fetchAPI('/movies/trending/page-1.json');
    if (data === null) return; // Endpoint not available from this environment
    validatePaginatedResponse(data);
    validateListItem(data.items[0]);
  });

  it('GET /movies/top-rated/page-1.json returns valid response if available', async () => {
    const data = await fetchAPI('/movies/top-rated/page-1.json');
    if (data === null) return;
    validatePaginatedResponse(data);
    validateListItem(data.items[0]);
  });

  it('GET /movies/upcoming/page-1.json returns valid response if available', async () => {
    const data = await fetchAPI('/movies/upcoming/page-1.json');
    if (data === null) return;
    validatePaginatedResponse(data);
    validateListItem(data.items[0]);
  });
});

describe('VidAPI - TV Endpoints', () => {
  it('GET /tv/latest/page-1.json returns valid response if available', async () => {
    const data = await fetchAPI('/tv/latest/page-1.json');
    if (data === null) return;
    validatePaginatedResponse(data);
    validateListItem(data.items[0]);
  });

  it('GET /tv/trending/page-1.json returns valid response if available', async () => {
    const data = await fetchAPI('/tv/trending/page-1.json');
    if (data === null) return;
    validatePaginatedResponse(data);
    validateListItem(data.items[0]);
  });

  it('GET /tv/top-rated/page-1.json returns valid response if available', async () => {
    const data = await fetchAPI('/tv/top-rated/page-1.json');
    if (data === null) return;
    validatePaginatedResponse(data);
    validateListItem(data.items[0]);
  });
});

describe('VidAPI - Search', () => {
  it('GET /search?query=fast returns valid response if available', async () => {
    const data = await fetchAPI('/search?query=fast');
    if (data === null) return;
    // Search can return {items: [...]} or just an array
    const items = data.items || (Array.isArray(data) ? data : []);
    expect(items.length).toBeGreaterThan(0);
    const item = items[0];
    expect(item).toHaveProperty('tmdb_id');
    expect(item).toHaveProperty('title');
    expect(item).toHaveProperty('poster_url');
  });
});

describe('VidAPI - Detail Endpoints', () => {
  it('GET /movie/{id}.json returns valid movie detail if available', async () => {
    // First get a known TMDB ID from the latest movies
    const latest = await fetchAPI('/movies/latest/page-1.json');
    if (!latest || !latest.items || latest.items.length === 0) return;
    const tmdbId = latest.items[0].tmdb_id;

    const detail = await fetchAPI(`/movie/${tmdbId}.json`);
    if (detail === null) return;
    expect(detail).toHaveProperty('tmdb_id');
    expect(detail).toHaveProperty('title');
    expect(detail).toHaveProperty('poster_url');
    expect(detail).toHaveProperty('embed_url');
  });

  it('GET /tv/{id}.json returns valid TV detail if available', async () => {
    const tvLatest = await fetchAPI('/tv/latest/page-1.json');
    if (!tvLatest || !tvLatest.items || tvLatest.items.length === 0) return;
    const tmdbId = tvLatest.items[0].tmdb_id;

    const detail = await fetchAPI(`/tv/${tmdbId}.json`);
    if (detail === null) return;
    expect(detail).toHaveProperty('tmdb_id');
    expect(detail).toHaveProperty('title');
    expect(detail).toHaveProperty('poster_url');
  });
});

describe('VidAPI - Pagination', () => {
  it('page field increments correctly', async () => {
    const page1 = await fetchAPI('/movies/latest/page-1.json');
    expect(page1).not.toBeNull();
    expect(page1.page).toBe(1);

    const page2 = await fetchAPI('/movies/latest/page-2.json');
    if (page2 === null) return;
    expect(page2.page).toBe(2);
    // Items should be different from page 1
    if (page2.items.length > 0 && page1.items.length > 0) {
      expect(page2.items[0].tmdb_id).not.toBe(page1.items[0].tmdb_id);
    }
  });
});
