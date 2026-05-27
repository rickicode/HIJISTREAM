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
  // poster_url may be empty string for some items without poster
  expect(typeof item.poster_url).toBe('string');
  if (item.poster_url) {
    expect(item.poster_url).toMatch(/^https?:\/\//);
  }
  // embed_url may be empty string for some items
  expect(typeof item.embed_url).toBe('string');
  if (item.embed_url) {
    expect(item.embed_url).toMatch(/^https?:\/\//);
  }
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
  expect(data.total_pages).toBeGreaterThan(0);
}

describe('VidAPI - Movies Endpoints', () => {
  it('GET /movies/latest/page-1.json returns valid paginated response', async () => {
    const data = await fetchAPI('/movies/latest/page-1.json');
    expect(data).not.toBeNull();
    validatePaginatedResponse(data);
    expect(data.page).toBe(1);
    // Validate multiple items to ensure structure is consistent
    validateListItem(data.items[0]);
    if (data.items.length > 1) {
      validateListItem(data.items[1]);
    }
  });

  it('GET /movies/latest/page-11.json returns different content (used as trending)', async () => {
    const data = await fetchAPI('/movies/latest/page-11.json');
    expect(data).not.toBeNull();
    validatePaginatedResponse(data);
    expect(data.page).toBe(11);
    validateListItem(data.items[0]);
  });

  it('GET /movies/latest/page-21.json returns different content (used as top-rated)', async () => {
    const data = await fetchAPI('/movies/latest/page-21.json');
    expect(data).not.toBeNull();
    validatePaginatedResponse(data);
    expect(data.page).toBe(21);
    validateListItem(data.items[0]);
  });
});

describe('VidAPI - TV Shows Endpoints', () => {
  it('GET /tvshows/latest/page-1.json returns valid paginated response', async () => {
    const data = await fetchAPI('/tvshows/latest/page-1.json');
    expect(data).not.toBeNull();
    validatePaginatedResponse(data);
    expect(data.page).toBe(1);
    validateListItem(data.items[0]);
  });

  it('GET /tvshows/latest/page-11.json returns different content (used as trending)', async () => {
    const data = await fetchAPI('/tvshows/latest/page-11.json');
    expect(data).not.toBeNull();
    validatePaginatedResponse(data);
    expect(data.page).toBe(11);
    validateListItem(data.items[0]);
  });
});

describe('VidAPI - Confirm non-working endpoints return 404', () => {
  it('GET /movies/trending/page-1.json returns 404', async () => {
    const data = await fetchAPI('/movies/trending/page-1.json');
    expect(data).toBeNull();
  });

  it('GET /tv/latest/page-1.json returns 404 (wrong path)', async () => {
    const data = await fetchAPI('/tv/latest/page-1.json');
    expect(data).toBeNull();
  });

  it('GET /movie/{id}.json returns 404 (no detail endpoint)', async () => {
    const data = await fetchAPI('/movie/363807.json');
    expect(data).toBeNull();
  });
});

describe('VidAPI - Pagination', () => {
  it('page field increments correctly for movies', async () => {
    const page1 = await fetchAPI('/movies/latest/page-1.json');
    expect(page1).not.toBeNull();
    expect(page1.page).toBe(1);

    const page2 = await fetchAPI('/movies/latest/page-2.json');
    expect(page2).not.toBeNull();
    expect(page2.page).toBe(2);
    // Items should be different from page 1
    if (page2.items.length > 0 && page1.items.length > 0) {
      expect(page2.items[0].tmdb_id).not.toBe(page1.items[0].tmdb_id);
    }
  });

  it('page field increments correctly for TV shows', async () => {
    const page1 = await fetchAPI('/tvshows/latest/page-1.json');
    expect(page1).not.toBeNull();
    expect(page1.page).toBe(1);

    const page2 = await fetchAPI('/tvshows/latest/page-2.json');
    expect(page2).not.toBeNull();
    expect(page2.page).toBe(2);
    if (page2.items.length > 0 && page1.items.length > 0) {
      expect(page2.items[0].tmdb_id).not.toBe(page1.items[0].tmdb_id);
    }
  });

  it('per_page is 24 items', async () => {
    const data = await fetchAPI('/movies/latest/page-1.json');
    expect(data).not.toBeNull();
    expect(data.per_page).toBe(24);
    expect(data.items.length).toBeLessThanOrEqual(24);
  });
});

describe('VidAPI - Response Data Quality', () => {
  it('items have valid embed_url format for movies', async () => {
    const data = await fetchAPI('/movies/latest/page-1.json');
    expect(data).not.toBeNull();
    const itemsWithEmbed = data.items.filter((item) => item.embed_url);
    expect(itemsWithEmbed.length).toBeGreaterThan(0);
    for (const item of itemsWithEmbed.slice(0, 5)) {
      expect(item.embed_url).toMatch(/^https:\/\/vaplayer\.ru\/embed\/movie\//);
    }
  });

  it('items have valid embed_url format for TV shows', async () => {
    const data = await fetchAPI('/tvshows/latest/page-1.json');
    expect(data).not.toBeNull();
    const itemsWithEmbed = data.items.filter((item) => item.embed_url);
    expect(itemsWithEmbed.length).toBeGreaterThan(0);
    for (const item of itemsWithEmbed.slice(0, 5)) {
      expect(item.embed_url).toMatch(/^https:\/\/vaplayer\.ru\/embed\/tv\//);
    }
  });

  it('total count reflects large catalog', async () => {
    const movies = await fetchAPI('/movies/latest/page-1.json');
    expect(movies).not.toBeNull();
    expect(movies.total).toBeGreaterThan(50000);

    const tv = await fetchAPI('/tvshows/latest/page-1.json');
    expect(tv).not.toBeNull();
    expect(tv.total).toBeGreaterThan(10000);
  });
});
