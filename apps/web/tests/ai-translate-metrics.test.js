import { describe, it, expect } from 'vitest';
import { parseSrtCues, cuesToSrt, translateSrtToIndonesian } from '../src/utils/ai-translate.js';
import { recordVisit, recordPlay } from '../src/utils/subtitle.js';

describe('AI Translate Cue Parser & Alignment', () => {
  const sampleSrt = `1
00:00:01,000 --> 00:00:04,000
Hello World

2
00:00:05,500 --> 00:00:08,200
How are you today?`;

  it('parses cues accurately', () => {
    const cues = parseSrtCues(sampleSrt);
    expect(cues.length).toBe(2);
    expect(cues[0].index).toBe(1);
    expect(cues[0].timing).toBe('00:00:01,000 --> 00:00:04,000');
    expect(cues[0].text).toBe('Hello World');
    expect(cues[1].index).toBe(2);
    expect(cues[1].text).toBe('How are you today?');
  });

  it('converts cues back to SRT format', () => {
    const cues = parseSrtCues(sampleSrt);
    const srt = cuesToSrt(cues);
    expect(srt).toContain('1\n00:00:01,000 --> 00:00:04,000\nHello World');
    expect(srt).toContain('2\n00:00:05,500 --> 00:00:08,200\nHow are you today?');
  });

  it('handles empty or invalid content gracefully', () => {
    expect(parseSrtCues('')).toEqual([]);
    expect(parseSrtCues(null)).toEqual([]);
  });

  it('enforces honesty guard on incomplete or failed translation', async () => {
    await expect(
      translateSrtToIndonesian(sampleSrt, {
        baseUrl: 'http://127.0.0.1:9999',
        apiKey: 'invalid-key',
      })
    ).rejects.toThrow();
  });
});

describe('Metrics Subsystem', () => {
  it('recordVisit and recordPlay execute safely without crashing', async () => {
    const mockEnv = {};
    const visitRes = await recordVisit(mockEnv, { visitorId: 'test-v1', path: '/movies/123' });
    expect(visitRes).toBeDefined();

    const playRes = await recordPlay(mockEnv, { id: '123', type: 'movie', title: 'Inception' });
    expect(playRes).toBeDefined();
  });
});
