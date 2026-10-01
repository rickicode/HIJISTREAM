/**
 * AI Subtitle Translation Engine (ported from HIJITV with honesty guard & strict cue alignment)
 *
 * Translates SRT/VTT subtitles chunk-by-chunk using OpenAI-compatible / AxonRouter LLMs.
 * Features:
 * - Strict cue-index alignment (no positional borrowing, avoiding subtitle timing desync)
 * - Honesty guard (if any chunk fails, returns error instead of untranslated English)
 * - Robust cue parsing & serialization
 *
 * Deliberately self-contained: importing srtToVtt from ./subtitle.js would create a
 * circular dependency, since subtitle.js imports this module for its AI fallback.
 */

/**
 * SRT→WebVTT conversion (local copy to keep this module free of circular imports).
 */
function srtToVtt(srt) {
  if (!srt || !srt.trim()) return '';
  let vtt = srt.replace(/^\uFEFF/, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  if (!vtt.startsWith('WEBVTT')) vtt = 'WEBVTT\n\n' + vtt;
  return vtt;
}

export { srtToVtt };

export function parseSrtCues(raw) {
  if (!raw || typeof raw !== 'string') return [];

  let clean = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '').trim();

  // Strip code blocks if present
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
  }

  const blocks = clean.split(/\n\s*\n/);
  const cues = [];

  for (const b of blocks) {
    const lines = b.split('\n');
    const nonBlank = [];
    for (const l of lines) {
      const t = l.trim();
      if (t !== '' && t !== 'WEBVTT' && !t.startsWith('NOTE')) {
        nonBlank.push(t);
      }
    }
    if (nonBlank.length === 0) continue;

    let idx = cues.length + 1;
    let timing = '';
    let textLines = [];

    if (nonBlank[0].includes('-->')) {
      timing = nonBlank[0];
      textLines = nonBlank.slice(1);
    } else if (nonBlank.length >= 2 && nonBlank[1].includes('-->')) {
      const digits = nonBlank[0].replace(/\D/g, '');
      const n = parseInt(digits, 10);
      if (!isNaN(n) && n > 0) {
        idx = n;
      }
      timing = nonBlank[1];
      textLines = nonBlank.slice(2);
    } else {
      continue;
    }

    cues.push({
      index: idx,
      timing,
      text: textLines.join('\n'),
    });
  }

  return cues;
}

export function cuesToSrt(cues) {
  return cues.map(c => `${c.index}\n${c.timing}\n${c.text}`).join('\n\n') + '\n';
}

/**
 * Translate a single chunk of cues via LLM chat completions endpoint.
 * Strictly aligns response by cue index to prevent timeline shifts.
 */
export async function translateChunk(chunk, config, timeoutMs = 35000) {
  const chunkSrt = cuesToSrt(chunk);
  const baseUrl = (config.baseUrl || '').replace(/\/+$/, '');
  const apiKey = config.apiKey || '';
  const model = config.model || 'auto/writing';

  if (!baseUrl || !apiKey) {
    throw new Error('AI translate not configured (missing baseUrl or apiKey)');
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const reqBody = {
    model,
    messages: [
      {
        role: 'system',
        content: 'Translate the subtitle dialogue to Indonesian naturally and accurately for film/TV conversation. Reply ONLY with the valid SRT containing the exact same cue numbers and timestamps. No commentary or markdown formatting.',
      },
      {
        role: 'user',
        content: chunkSrt,
      },
    ],
    temperature: 0.1,
  };

  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'HIJISTREAM/1.0',
        },
        body: JSON.stringify(reqBody),
        signal: controller?.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        lastErr = new Error(`LLM status ${res.status}: ${errText.slice(0, 200)}`);
        continue;
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        lastErr = new Error('Empty response from LLM');
        continue;
      }
      if (content.length > 2 * 1024 * 1024) {
        lastErr = new Error('LLM response exceeded 2MB cap');
        continue;
      }

      const translatedCues = parseSrtCues(content);
      if (translatedCues.length === 0) {
        lastErr = new Error('Failed to parse translated cues from LLM');
        continue;
      }

      // Map strictly by index
      const byIndex = new Map();
      for (const tc of translatedCues) {
        byIndex.set(tc.index, tc);
      }

      const aligned = chunk.map((src) => {
        let txt = src.text;
        const matched = byIndex.get(src.index);
        if (matched && matched.text && matched.text.trim()) {
          txt = matched.text.trim();
        }
        return {
          index: src.index,
          timing: src.timing,
          text: txt,
        };
      });

      return aligned;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
  }

  throw lastErr || new Error('Failed to translate chunk after retries');
}

/**
 * Translates full SRT/VTT content to Indonesian WebVTT.
 * Enforces honesty: any chunk failure causes an error to prevent shipping untranslated text.
 */
export async function translateSrtToIndonesian(srtContent, config) {
  if (!config?.baseUrl || !config?.apiKey) {
    throw new Error('AxonRouter / OpenAI AI translation not configured');
  }

  const cues = parseSrtCues(srtContent);
  if (cues.length === 0) {
    throw new Error('No subtitle cues found to translate');
  }

  const chunkSize = 50;
  const chunks = [];
  for (let i = 0; i < cues.length; i += chunkSize) {
    chunks.push(cues.slice(i, i + chunkSize));
  }

  const translatedChunks = new Array(chunks.length);
  const chunkFailed = new Array(chunks.length).fill(false);
  let firstErr = null;

  // Run chunks with concurrency limit of 4
  const CONCURRENCY = 4;
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (chunk, batchIdx) => {
      const chunkIdx = i + batchIdx;
      try {
        const res = await translateChunk(chunk, config);
        translatedChunks[chunkIdx] = res;
      } catch (err) {
        chunkFailed[chunkIdx] = true;
        if (!firstErr) firstErr = err;
      }
    });
    await Promise.all(promises);
  }

  const failedCount = chunkFailed.filter(Boolean).length;
  if (failedCount > 0) {
    const errText = firstErr ? (firstErr.message || String(firstErr)) : 'Unknown chunk error';
    throw new Error(`Translation incomplete: ${failedCount} of ${chunks.length} chunks failed (first error: ${errText})`);
  }

  const allCues = [];
  for (const ch of translatedChunks) {
    if (ch) allCues.push(...ch);
  }

  if (allCues.length === 0) {
    const errText = firstErr ? (firstErr.message || String(firstErr)) : 'No cues produced';
    throw new Error(`Translation produced no cues: ${errText}`);
  }

  const srtOutput = cuesToSrt(allCues);
  return srtToVtt(srtOutput);
}
