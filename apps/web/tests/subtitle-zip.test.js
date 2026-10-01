import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { extractSubtitleFromZip, extractSubtitlesFromZip } from '../src/utils/subtitle.js';

const SRT = '1\n00:00:01,000 --> 00:00:04,000\nHalo dunia\n';

function makeZip(files) {
  const entries = {};
  for (const [name, content] of Object.entries(files)) entries[name] = strToU8(content);
  return zipSync(entries);
}

describe('zip subtitle extraction', () => {
  const hadDecompressionStream = 'DecompressionStream' in globalThis;
  const savedDecompressionStream = globalThis.DecompressionStream;

  // Vercel Edge (middleware runtime) exposes no DecompressionStream, which is
  // exactly where /subtitles/download runs. Reproduce that host.
  beforeEach(() => {
    delete globalThis.DecompressionStream;
  });

  afterEach(() => {
    if (hadDecompressionStream) globalThis.DecompressionStream = savedDecompressionStream;
    else delete globalThis.DecompressionStream;
  });

  it('extracts a deflated srt without DecompressionStream', () => {
    const content = extractSubtitleFromZip(makeZip({ 'movie.srt': SRT }));
    expect(content).toContain('00:00:01,000 --> 00:00:04,000');
    expect(content).toContain('Halo dunia');
  });

  it('returns every subtitle entry and skips unrelated files', () => {
    const entries = extractSubtitlesFromZip(
      makeZip({ 'a.srt': SRT, 'notes.txt': 'not a subtitle', 'b.vtt': SRT }),
    );
    expect(entries.map((e) => e.filename)).toEqual(['a.srt', 'b.vtt']);
    expect(entries.every((e) => e.content.includes('-->'))).toBe(true);
  });

  it('returns null/[] for input that is not a zip archive', () => {
    expect(extractSubtitleFromZip(new TextEncoder().encode('plain text'))).toBeNull();
    expect(extractSubtitlesFromZip(new TextEncoder().encode('plain text'))).toEqual([]);
  });

  it('returns null when the archive holds no subtitle file', () => {
    expect(extractSubtitleFromZip(makeZip({ 'readme.txt': 'no cues here' }))).toBeNull();
  });
});
