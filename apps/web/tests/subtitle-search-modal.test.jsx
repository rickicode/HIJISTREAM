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
    // The loading state names every provider it is querying, so the copy can
    // never claim a provider the registry does not have.
    const loader = await screen.findByText(new RegExp(`Mencari di ${names.length} provider`));
    for (const name of names) expect(loader.textContent).toContain(name);
  });

  it('surfaces the server error message when a download fails', async () => {
    vi.spyOn(api, 'searchSubtitles').mockResolvedValue({ results: [RESULT], providers: ['opensubtitles_com'] });
    vi.spyOn(api, 'downloadSubtitle').mockRejectedValue(
      new Error('OpenSubtitles.com menolak unduhan: You have downloaded your allowed 20 subtitles for 24h'),
    );

    render(<SubtitleSearchModal open onClose={() => {}} item={ITEM} />);
    fireEvent.click(await screen.findByRole('button', { name: /Unduh subtitle/ }));

    expect(await screen.findByText(/menolak unduhan/)).toBeTruthy();
    // Row reflects the failure instead of staying actionable-looking.
    expect(await screen.findByText('Gagal')).toBeTruthy();
  });

  it('reports a non-throwing response with no subtitle as a failure', async () => {
    vi.spyOn(api, 'searchSubtitles').mockResolvedValue({ results: [RESULT], providers: ['opensubtitles_com'] });
    vi.spyOn(api, 'downloadSubtitle').mockResolvedValue({ success: false });

    render(<SubtitleSearchModal open onClose={() => {}} item={ITEM} />);
    fireEvent.click(await screen.findByRole('button', { name: /Unduh subtitle/ }));

    expect(
      await screen.findByText(`Gagal mengunduh dari ${PROVIDER_LABELS[RESULT.provider]}.`),
    ).toBeTruthy();
    expect(await screen.findByText('Gagal')).toBeTruthy();
  });

  it('keeps the download state when the caller re-renders with a fresh item object', async () => {
    vi.spyOn(api, 'searchSubtitles').mockResolvedValue({ results: [RESULT], diagnostics: [] });
    vi.spyOn(api, 'downloadSubtitle').mockResolvedValue({ success: true, subtitle: { url: 'x.vtt' } });

    const { rerender } = render(<SubtitleSearchModal open onClose={() => {}} item={ITEM} />);
    fireEvent.click(await screen.findByRole('button', { name: /Unduh subtitle/ }));
    expect(await screen.findByText('Tersimpan')).toBeTruthy();
    expect(api.searchSubtitles).toHaveBeenCalledTimes(1);

    // MovieDetail and EpisodeList build the item inline, so every parent render
    // hands over a new identity. Depending on the object itself re-ran the
    // search and wiped the row state the user had just produced.
    rerender(<SubtitleSearchModal open onClose={() => {}} item={{ ...ITEM }} />);
    expect(screen.getByText('Tersimpan')).toBeTruthy();
    expect(api.searchSubtitles).toHaveBeenCalledTimes(1);
  });

  it('filters the list by language and reports how many rows remain', async () => {
    vi.spyOn(api, 'searchSubtitles').mockResolvedValue({
      results: [RESULT, { ...RESULT, fileId: '99', lang: 'id', title: 'Indonesian' }],
      diagnostics: [],
    });

    render(<SubtitleSearchModal open onClose={() => {}} item={ITEM} />);
    const select = await screen.findByLabelText('Bahasa');
    // The control must offer every language present, with its count.
    expect(screen.getByRole('option', { name: 'English (1)' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Indonesian (1)' })).toBeTruthy();

    fireEvent.change(select, { target: { value: 'id' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('1 dari 2 subtitle')).toBeTruthy();

    fireEvent.change(select, { target: { value: '' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
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
