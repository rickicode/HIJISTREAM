import { describe, it, expect } from 'vitest';
import { getMovieEmbedUrl, getTVEmbedUrl } from '../src/utils/player';

describe('getMovieEmbedUrl', () => {
  it('returns base URL with no options', () => {
    const url = getMovieEmbedUrl('tt1234567');
    expect(url).toBe('https://vaplayer.ru/embed/movie/tt1234567');
  });

  it('returns URL with resumeAt parameter', () => {
    const url = getMovieEmbedUrl('tt1234567', 300);
    expect(url).toBe('https://vaplayer.ru/embed/movie/tt1234567?resumeAt=300');
  });

  it('floors the resumeAt value', () => {
    const url = getMovieEmbedUrl('tt1234567', 123.7);
    expect(url).toBe('https://vaplayer.ru/embed/movie/tt1234567?resumeAt=123');
  });

  it('returns URL with skin parameter', () => {
    const url = getMovieEmbedUrl('tt1234567', null, { skin: 'netflix' });
    expect(url).toBe('https://vaplayer.ru/embed/movie/tt1234567?skin=netflix');
  });

  it('returns URL with ds_lang parameter', () => {
    const url = getMovieEmbedUrl('tt1234567', null, { dsLang: 'id' });
    expect(url).toBe('https://vaplayer.ru/embed/movie/tt1234567?ds_lang=id');
  });

  it('returns URL with all options combined', () => {
    const url = getMovieEmbedUrl('tt1234567', 300, { skin: 'netflix', dsLang: 'id' });
    expect(url).toBe('https://vaplayer.ru/embed/movie/tt1234567?resumeAt=300&skin=netflix&ds_lang=id');
  });

  it('works with numeric TMDB ID', () => {
    const url = getMovieEmbedUrl(550, 60, { skin: 'netflix' });
    expect(url).toBe('https://vaplayer.ru/embed/movie/550?resumeAt=60&skin=netflix');
  });

  it('ignores null dsLang', () => {
    const url = getMovieEmbedUrl('tt1234567', 300, { skin: 'netflix', dsLang: null });
    expect(url).toBe('https://vaplayer.ru/embed/movie/tt1234567?resumeAt=300&skin=netflix');
  });
});

describe('getTVEmbedUrl', () => {
  it('returns base URL with season and episode', () => {
    const url = getTVEmbedUrl(1396, 1, 1);
    expect(url).toBe('https://vaplayer.ru/embed/tv/1396/1/1');
  });

  it('returns URL without season/episode path when not provided', () => {
    const url = getTVEmbedUrl(1396);
    expect(url).toBe('https://vaplayer.ru/embed/tv/1396');
  });

  it('returns URL with resumeAt parameter', () => {
    const url = getTVEmbedUrl(1396, 1, 1, 300);
    expect(url).toBe('https://vaplayer.ru/embed/tv/1396/1/1?resumeAt=300');
  });

  it('returns URL with skin parameter', () => {
    const url = getTVEmbedUrl(1396, 2, 5, null, { skin: 'netflix' });
    expect(url).toBe('https://vaplayer.ru/embed/tv/1396/2/5?skin=netflix');
  });

  it('returns URL with ds_lang parameter', () => {
    const url = getTVEmbedUrl(1396, 1, 1, null, { dsLang: 'id' });
    expect(url).toBe('https://vaplayer.ru/embed/tv/1396/1/1?ds_lang=id');
  });

  it('returns URL with all options combined', () => {
    const url = getTVEmbedUrl(1396, 1, 1, 300, { skin: 'netflix', dsLang: 'id' });
    expect(url).toBe('https://vaplayer.ru/embed/tv/1396/1/1?resumeAt=300&skin=netflix&ds_lang=id');
  });

  it('ignores null dsLang', () => {
    const url = getTVEmbedUrl(1396, 1, 1, 300, { skin: 'netflix', dsLang: null });
    expect(url).toBe('https://vaplayer.ru/embed/tv/1396/1/1?resumeAt=300&skin=netflix');
  });
});
