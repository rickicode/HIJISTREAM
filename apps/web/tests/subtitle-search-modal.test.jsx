// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SubtitleSearchModal from '../src/components/SubtitleSearchModal';
import api from '../src/utils/api';
import { PROVIDER_LABELS } from '../src/utils/subtitle-constants';

const ITEM = { id: 27205, title: 'Inception', type: 'movie' };
const RESULT = {
  provider: 'opensubtitles_com', fileId: '12345', lang: 'en', title: 'English',
  downloadCount: 42, rating: 8.4, format: 'srt', hearingImpaired: false,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SubtitleSearchModal', () => {
  it('loader copy derives provider count and names from the shared registry', async () => {
    vi.spyOn(api, 'searchSubtitles').mockReturnValue(new Promise(() => {})); // never settles

    render(<SubtitleSearchModal open onClose={() => {}} item={ITEM} />);

    const names = Object.values(PROVIDER_LABELS);
    expect(
      await screen.findByText(`Mencari dari ${names.length} provider...`),
    ).toBeTruthy();
    expect(screen.getByText(names.join(' • '))).toBeTruthy();
  });

  it('surfaces the server error message when a download fails', async () => {
    vi.spyOn(api, 'searchSubtitles').mockResolvedValue({ results: [RESULT], providers: ['opensubtitles_com'] });
    vi.spyOn(api, 'downloadSubtitle').mockRejectedValue(
      new Error('OpenSubtitles.com menolak unduhan: You have downloaded your allowed 20 subtitles for 24h'),
    );

    render(<SubtitleSearchModal open onClose={() => {}} item={ITEM} />);
    fireEvent.click(await screen.findByRole('button', { name: /Download/ }));

    expect(await screen.findByText(/menolak unduhan/)).toBeTruthy();
    // Row reflects the failure instead of staying actionable-looking.
    expect(await screen.findByText('Gagal')).toBeTruthy();
  });

  it('reports a non-throwing response with no subtitle as a failure', async () => {
    vi.spyOn(api, 'searchSubtitles').mockResolvedValue({ results: [RESULT], providers: ['opensubtitles_com'] });
    vi.spyOn(api, 'downloadSubtitle').mockResolvedValue({ success: false });

    render(<SubtitleSearchModal open onClose={() => {}} item={ITEM} />);
    fireEvent.click(await screen.findByRole('button', { name: /Download/ }));

    expect(
      await screen.findByText(`Gagal mengunduh dari ${PROVIDER_LABELS[RESULT.provider]}.`),
    ).toBeTruthy();
    expect(await screen.findByText('Gagal')).toBeTruthy();
  });

  it('shows a provider-problems strip for failures/odd skips, not for unconfigured ones', async () => {
    vi.spyOn(api, 'searchSubtitles').mockResolvedValue({
      results: [],
      diagnostics: [
        { provider: 'opensubtitles_com', status: 'error', count: 0, message: 'login gagal (cek API key / username / password)' },
        { provider: 'subdl', status: 'skipped', count: 0, message: 'belum dikonfigurasi' },
        { provider: 'subtitlecat', status: 'empty', count: 0, message: null },
      ],
    });

    render(<SubtitleSearchModal open onClose={() => {}} item={ITEM} />);

    // The failure is named: provider + the server's reason, under a heading.
    expect(await screen.findByText('Provider bermasalah')).toBeTruthy();
    expect(screen.getByText('OS.com')).toBeTruthy();
    expect(screen.getByText(/login gagal \(cek API key/)).toBeTruthy();
    // An unconfigured provider is boring configuration state, not a "problem"
    // the user needs to see, and a plain empty result needs no explanation.
    expect(screen.queryByText(/belum dikonfigurasi/)).toBeNull();
  });
});
