/**
 * Shared utilities for admin components.
 */

export function formatDate(iso) {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '-';
  const units = ['B', 'KB', 'MB'];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) { size /= 1024; unitIdx++; }
  return `${size.toFixed(1)} ${units[unitIdx]}`;
}

export const LANG_LABELS = {
  id: 'Bahasa Indonesia', en: 'English', es: 'Español', pt: 'Português',
  hi: 'हिन्दी', ja: '日本語', ko: '한국어',
};

/**
 * CustomTooltip — shared recharts tooltip component.
 */
export function CustomTooltip(props) {
  const { active, payload, label } = props || {};
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[#b3b3b3] text-xs mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-white text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}
