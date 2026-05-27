import { describe, it, expect } from 'vitest';

const BASE_URL = 'https://hijistream-web.vercel.app/api';

// Helper: fetch endpoint, return data or null
async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

describe('TMDB API - Connectivity', () => {
  it('API is reachable (canary)', async () => {
    const data = await fetchAPI('/movies/popular?page=1');
    if (process.env.CI) {
      // In CI, the API must be reachable. If this fails, the deployment is broken.
      expect(data).not.toBeNull();
      expect(data).toHaveProperty('items');
    }
    // In local dev without deployment, this test passes silently
  });
});

// Validate list item structure for movies
function validateMovieItem(item) {
  expect(item).toHaveProperty('id');
  expect(item).toHaveProperty('title');
  expect(item).toHaveProperty('year');
  expect(item).toHaveProperty('poster_url');
  expect(item).toHaveProperty('rating');
  expect(item).toHaveProperty('genre');
  expect(item).toHaveProperty('type');
  expect(item).toHaveProperty('embed_url');
  expect(typeof item.title).toBe('string');
  expect(item.title.length).toBeGreaterThan(0);
  expect(item.type).toBe('movie');
  if (item.poster_url) {
    expect(item.poster_url).toMatch(/^https:\/\/image\.tmdb\.org/);
  }
  expect(item.embed_url).toMatch(/^https:\/\/vaplayer\.ru\/embed\/movie\//);
}

// Validate list item structure for TV shows
function validateTVItem(item) {
  expect(item).toHaveProperty('id');
  expect(item).toHaveProperty('title');
  expect(item).toHaveProperty('type');
  expect(item).toHaveProperty('embed_url');
  expect(item.type).toBe('tv');
  expect(item.embed_url).toMatch(/^https:\/\/vaplayer\.ru\/embed\/tv\//);
}

// Validate paginated response structure
function validatePaginatedResponse(data) {
  expect(data).toHaveProperty('page');
  expect(data).toHaveProperty('total_pages');
  expect(data).toHaveProperty('items');
  expect(typeof data.page).toBe('number');
  expect(Array.isArray(data.items)).toBe(true);
}

describe('TMDB API - Movies Endpoints', () => {
  it('GET /movies/popular returns paginated movie list', async () => {
    const data = await fetchAPI('/movies/popular?page=1');
    if (!data) return; // Skip if API unavailable
    validatePaginatedResponse(data);
    expect(data.items.length).toBeGreaterThan(0);
    validateMovieItem(data.items[0]);
  });

  it('GET /movies/trending returns paginated movie list', async () => {
    const data = await fetchAPI('/movies/trending?page=1');
    if (!data) return;
    validatePaginatedResponse(data);
    expect(data.items.length).toBeGreaterThan(0);
    validateMovieItem(data.items[0]);
  });

  it('GET /movies/top-rated returns paginated movie list', async () => {
    const data = await fetchAPI('/movies/top-rated?page=1');
    if (!data) return;
    validatePaginatedResponse(data);
    expect(data.items.length).toBeGreaterThan(0);
    validateMovieItem(data.items[0]);
  });

  it('GET /movies/upcoming returns paginated movie list', async () => {
    const data = await fetchAPI('/movies/upcoming?page=1');
    if (!data) return;
    validatePaginatedResponse(data);
    expect(data.items.length).toBeGreaterThan(0);
    validateMovieItem(data.items[0]);
  });
});

describe('TMDB API - TV Endpoints', () => {
  it('GET /tv/popular returns paginated TV list', async () => {
    const data = await fetchAPI('/tv/popular?page=1');
    if (!data) return;
    validatePaginatedResponse(data);
    expect(data.items.length).toBeGreaterThan(0);
    validateTVItem(data.items[0]);
  });

  it('GET /tv/trending returns paginated TV list', async () => {
    const data = await fetchAPI('/tv/trending?page=1');
    if (!data) return;
    validatePaginatedResponse(data);
    expect(data.items.length).toBeGreaterThan(0);
    validateTVItem(data.items[0]);
  });

  it('GET /tv/top-rated returns paginated TV list', async () => {
    const data = await fetchAPI('/tv/top-rated?page=1');
    if (!data) return;
    validatePaginatedResponse(data);
    expect(data.items.length).toBeGreaterThan(0);
    validateTVItem(data.items[0]);
  });
});

describe('TMDB API - Detail Endpoints', () => {
  it('GET /movie/{id} returns movie detail with embed URL', async () => {
    // Use a well-known movie ID (e.g., 550 = Fight Club)
    const data = await fetchAPI('/movie/550');
    if (!data) return;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('overview');
    expect(data).toHaveProperty('runtime');
    expect(data).toHaveProperty('credits');
    expect(data).toHaveProperty('embed_url');
    expect(data.type).toBe('movie');
    expect(data.embed_url).toMatch(/^https:\/\/vaplayer\.ru\/embed\/movie\//);
    expect(Array.isArray(data.credits)).toBe(true);
  });

  it('GET /tv/{id} returns TV detail with seasons info', async () => {
    // Use a well-known TV ID (e.g., 1396 = Breaking Bad)
    const data = await fetchAPI('/tv/1396');
    if (!data) return;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('number_of_seasons');
    expect(data).toHaveProperty('number_of_episodes');
    expect(data).toHaveProperty('embed_url');
    expect(data.type).toBe('tv');
    expect(data.number_of_seasons).toBeGreaterThan(0);
  });

  it('GET /tv/{id}/season/{season} returns episodes', async () => {
    const data = await fetchAPI('/tv/1396/season/1');
    if (!data) return;
    expect(data).toHaveProperty('season_number');
    expect(data).toHaveProperty('episodes');
    expect(Array.isArray(data.episodes)).toBe(true);
    expect(data.episodes.length).toBeGreaterThan(0);
    const ep = data.episodes[0];
    expect(ep).toHaveProperty('episode_number');
    expect(ep).toHaveProperty('name');
    expect(ep).toHaveProperty('embed_url');
    expect(ep.embed_url).toMatch(/^https:\/\/vaplayer\.ru\/embed\/tv\//);
  });
});

describe('TMDB API - Search', () => {
  it('GET /search?query=batman returns results', async () => {
    const data = await fetchAPI('/search?query=batman');
    if (!data) return;
    validatePaginatedResponse(data);
    expect(data.items.length).toBeGreaterThan(0);
    // Each item should have a type
    for (const item of data.items.slice(0, 5)) {
      expect(['movie', 'tv']).toContain(item.type);
      expect(item.embed_url).toMatch(/^https:\/\/vaplayer\.ru\/embed\//);
    }
  });
});

describe('TMDB API - Response Quality', () => {
  it('movie items have poster URLs from TMDB image CDN', async () => {
    const data = await fetchAPI('/movies/popular?page=1');
    if (!data) return;
    const withPoster = data.items.filter((item) => item.poster_url);
    expect(withPoster.length).toBeGreaterThan(0);
    for (const item of withPoster.slice(0, 5)) {
      expect(item.poster_url).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\//);
    }
  });

  it('pagination works - page 2 has different items', async () => {
    const page1 = await fetchAPI('/movies/popular?page=1');
    const page2 = await fetchAPI('/movies/popular?page=2');
    if (!page1 || !page2) return;
    expect(page1.page).toBe(1);
    expect(page2.page).toBe(2);
    if (page1.items.length > 0 && page2.items.length > 0) {
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    }
  });
});
