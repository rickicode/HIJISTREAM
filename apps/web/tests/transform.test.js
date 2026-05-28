import { describe, it, expect } from 'vitest';

// Test the transformation logic directly (no network needed)
const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

function mapGenreIds(ids) {
  if (!ids || !Array.isArray(ids)) return '';
  return ids
    .map((id) => GENRE_MAP[id] || '')
    .filter(Boolean)
    .join(', ');
}

function transformMovieListItem(movie) {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.release_date?.substring(0, 4) || '',
    poster_url: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : '',
    backdrop_url: movie.backdrop_path
      ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
      : '',
    rating: movie.vote_average?.toFixed(1) || '0.0',
    genre: mapGenreIds(movie.genre_ids),
    overview: movie.overview || '',
    popularity: movie.popularity,
    type: 'movie',
    embed_url: `https://vaplayer.ru/embed/movie/${movie.id}`,
  };
}

function transformTVListItem(show) {
  return {
    id: show.id,
    title: show.name,
    year: show.first_air_date?.substring(0, 4) || '',
    poster_url: show.poster_path
      ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
      : '',
    backdrop_url: show.backdrop_path
      ? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
      : '',
    rating: show.vote_average?.toFixed(1) || '0.0',
    genre: mapGenreIds(show.genre_ids),
    overview: show.overview || '',
    popularity: show.popularity,
    type: 'tv',
    embed_url: `https://vaplayer.ru/embed/tv/${show.id}`,
  };
}

describe('TMDB Response Transform - Genre Mapping', () => {
  it('maps genre IDs to names', () => {
    expect(mapGenreIds([28, 12])).toBe('Action, Adventure');
    expect(mapGenreIds([18, 53])).toBe('Drama, Thriller');
  });

  it('handles empty/null genre IDs', () => {
    expect(mapGenreIds(null)).toBe('');
    expect(mapGenreIds([])).toBe('');
    expect(mapGenreIds(undefined)).toBe('');
  });

  it('skips unknown genre IDs', () => {
    expect(mapGenreIds([28, 99999])).toBe('Action');
  });
});

describe('TMDB Response Transform - Movie List Item', () => {
  it('transforms a complete movie object', () => {
    const raw = {
      id: 550,
      title: 'Fight Club',
      release_date: '1999-10-15',
      poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      backdrop_path: '/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg',
      vote_average: 8.4,
      genre_ids: [18, 53],
      overview: 'A ticking-loss time bomb...',
      popularity: 45.6,
    };
    const result = transformMovieListItem(raw);
    expect(result.id).toBe(550);
    expect(result.title).toBe('Fight Club');
    expect(result.year).toBe('1999');
    expect(result.poster_url).toBe(
      'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
    );
    expect(result.backdrop_url).toContain('original');
    expect(result.rating).toBe('8.4');
    expect(result.genre).toBe('Drama, Thriller');
    expect(result.type).toBe('movie');
    expect(result.embed_url).toBe('https://vaplayer.ru/embed/movie/550');
  });

  it('handles missing optional fields', () => {
    const raw = {
      id: 1,
      title: 'Test',
      release_date: null,
      poster_path: null,
      backdrop_path: null,
      vote_average: null,
      genre_ids: null,
      overview: null,
      popularity: 0,
    };
    const result = transformMovieListItem(raw);
    expect(result.year).toBe('');
    expect(result.poster_url).toBe('');
    expect(result.backdrop_url).toBe('');
    expect(result.rating).toBe('0.0');
    expect(result.genre).toBe('');
  });
});

describe('TMDB Response Transform - TV List Item', () => {
  it('transforms a TV show object', () => {
    const raw = {
      id: 1396,
      name: 'Breaking Bad',
      first_air_date: '2008-01-20',
      poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
      backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
      vote_average: 8.9,
      genre_ids: [18, 80],
      overview: 'A chemistry teacher...',
      popularity: 100.2,
    };
    const result = transformTVListItem(raw);
    expect(result.id).toBe(1396);
    expect(result.title).toBe('Breaking Bad');
    expect(result.year).toBe('2008');
    expect(result.type).toBe('tv');
    expect(result.embed_url).toBe('https://vaplayer.ru/embed/tv/1396');
    expect(result.genre).toBe('Drama, Crime');
  });
});

describe('TMDB Response Transform - Embed URL Format', () => {
  it('movie embed URL uses TMDB ID', () => {
    const result = transformMovieListItem({
      id: 12345,
      title: 'X',
      genre_ids: [],
      popularity: 0,
    });
    expect(result.embed_url).toBe('https://vaplayer.ru/embed/movie/12345');
  });

  it('TV embed URL uses TMDB ID', () => {
    const result = transformTVListItem({
      id: 67890,
      name: 'Y',
      genre_ids: [],
      popularity: 0,
    });
    expect(result.embed_url).toBe('https://vaplayer.ru/embed/tv/67890');
  });
});

describe('TMDB Response Transform - Item Filtering', () => {
  function filterValidItems(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && item.id && item.title && item.title.trim() !== '');
  }

  it('filters out items with missing id', () => {
    const items = [
      { id: 1, title: 'Good' },
      { id: null, title: 'Bad' },
      { title: 'No ID' },
    ];
    const result = filterValidItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Good');
  });

  it('filters out items with missing or empty title', () => {
    const items = [
      { id: 1, title: 'Good' },
      { id: 2, title: '' },
      { id: 3, title: '   ' },
      { id: 4 },
    ];
    const result = filterValidItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('handles null/undefined input', () => {
    expect(filterValidItems(null)).toEqual([]);
    expect(filterValidItems(undefined)).toEqual([]);
  });

  it('handles empty array', () => {
    expect(filterValidItems([])).toEqual([]);
  });

  it('filters out null items in array', () => {
    const items = [null, undefined, { id: 1, title: 'Good' }];
    const result = filterValidItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});
