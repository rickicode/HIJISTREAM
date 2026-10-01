import { ArrowDownToLine, CheckCircle, Download, Loader, Star, XCircle } from 'lucide-react';
import { LANG_FLAGS, LANG_LABELS, PROVIDER_LABELS, PROVIDER_COLORS } from '../utils/subtitle-constants';

/**
 * One search result. Kept out of the modal so the modal holds layout and state
 * only, and so the row can be reasoned about on its own.
 *
 * @param {object} sub - result row from /api/subtitles/search
 * @param {'idle'|'downloading'|'ok'|'fail'} state
 * @param {(sub: object) => void} onDownload
 */
export default function SubtitleResultRow({ sub, state, onDownload }) {
  const flag = LANG_FLAGS[sub.lang] || '🌐';
  const langName = LANG_LABELS[sub.lang] || sub.lang.toUpperCase();
  const providerName = PROVIDER_LABELS[sub.provider] || sub.provider;
  const providerColor = PROVIDER_COLORS[sub.provider] || 'text-gray-400 bg-gray-400/10';
  const title = sub.title || `Subtitle ${langName}`;

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        state === 'ok'
          ? 'border-green-500/30 bg-green-500/5'
          : state === 'fail'
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-[#2a2a2a] hover:border-[#3d3d3d] hover:bg-[#212121]'
      }`}
    >
      <span aria-hidden="true" className="w-6 shrink-0 text-center text-base leading-none">{flag}</span>

      <div className="min-w-0 flex-1">
        {/* Release names are long and carry the useful detail, so the full value
            stays reachable on hover and for screen readers. */}
        <p className="truncate text-[13px] font-medium leading-5 text-white" title={title}>{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-[#a3a3a3]">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${providerColor}`}>{providerName}</span>
          <span>{langName}</span>
          {sub.downloadCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <ArrowDownToLine size={11} aria-hidden="true" />
              {sub.downloadCount.toLocaleString()}
            </span>
          )}
          {sub.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star size={11} aria-hidden="true" />
              {sub.rating}
            </span>
          )}
          {sub.format && <span className="uppercase">{sub.format}</span>}
          {sub.hearingImpaired && (
            <span className="rounded bg-yellow-400/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
              HI
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {state === 'ok' && (
          <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
            <CheckCircle size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Tersimpan</span>
          </span>
        )}
        {state === 'fail' && (
          <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
            <XCircle size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Gagal</span>
          </span>
        )}
        {(state === 'idle' || state === 'downloading') && (
          <button
            type="button"
            onClick={() => onDownload(sub)}
            disabled={state === 'downloading'}
            aria-label={`Unduh subtitle ${langName} dari ${providerName}`}
            className="inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-md bg-[#E50914] text-xs font-semibold text-white transition-colors hover:bg-[#f6121d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60 sm:h-9 sm:w-auto sm:px-3"
          >
            {state === 'downloading' ? (
              <Loader size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Download size={14} aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{state === 'downloading' ? 'Mengunduh' : 'Unduh'}</span>
          </button>
        )}
      </div>
    </li>
  );
}