import { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, Loader, Eye, EyeOff, HardDrive, RefreshCw } from 'lucide-react';
import api from '../../utils/api';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function ProviderField({ label, name, value, onChange, type = 'text', placeholder }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="block text-xs text-[#808080] mb-1">{label}</label>
      <div className="relative">
        <input
          name={name} value={value} onChange={onChange}
          type={isPassword && !show ? 'password' : 'text'}
          placeholder={placeholder}
          className={`w-full px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#E50914] transition-colors ${isPassword ? 'pr-9' : ''}`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#999]">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

function ProviderCard({ title, badge, fields, checkResult, onCheck, onSave, checking, saving, canCheck }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{title}</span>
          {badge && <span className="text-xs px-1.5 py-0.5 bg-[#2a2a2a] text-[#808080] rounded">{badge}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCheck} disabled={checking || !canCheck}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-[#444] text-[#ccc] rounded hover:border-[#666] transition-colors disabled:opacity-40">
            {checking ? <Loader size={11} className="animate-spin" /> : <CheckCircle size={11} />} Cek
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-[#E50914] text-white rounded hover:bg-[#f6121d] transition-colors disabled:opacity-40">
            {saving ? <Loader size={11} className="animate-spin" /> : <Save size={11} />} Simpan
          </button>
        </div>
      </div>
      {fields}
      {checkResult && (
        <div className={`flex items-start gap-1.5 text-xs px-2.5 py-2 rounded border ${checkResult.success ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
          {checkResult.success ? <CheckCircle size={12} className="mt-0.5 shrink-0" /> : <XCircle size={12} className="mt-0.5 shrink-0" />}
          <span>{checkResult.message}</span>
        </div>
      )}
    </div>
  );
}

function R2Status() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api.getR2Status().then(setStatus).catch(() => setStatus(null)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white">Status R2 Storage</h2>
        <button onClick={load} disabled={loading} className="p-1 text-[#555] hover:text-white disabled:opacity-40"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
      </div>
      {loading && !status ? <div className="text-xs text-[#666] py-2 flex items-center gap-1.5"><Loader size={12} className="animate-spin" />Memuat...</div>
       : !status ? <p className="text-xs text-red-400">Gagal memuat status R2.</p>
       : !status.configured ? <div className="text-xs text-[#808080] bg-[#1a1a1a] border border-[#2a2a2a] rounded p-3"><XCircle size={12} className="inline mr-1 text-red-400" />R2 belum dikonfigurasi: <code className="text-[#aaa]">{(status.missing||[]).join(', ')}</code></div>
       : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#2a2a2a]">
            {[['Bucket', status.bucket], ['Objects', status.objectCount ?? '—'], ['Total Size', formatBytes(status.totalSize)], ['OS Kredensial', status.osConfigured ? 'ENV' : 'Web']].map(([label, val]) => (
              <div key={label} className="p-3"><div className="text-xs text-[#808080] mb-1">{label}</div><div className="text-sm font-semibold text-white truncate">{val}</div></div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-[#2a2a2a] flex items-center gap-1 text-xs text-[#555]">
            <HardDrive size={11} />{status.publicUrl}
          </div>
        </div>
       )}
    </div>
  );
}

export default function SettingsTab() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader size={22} className="animate-spin text-[#E50914]" /></div>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-0.5">System Settings</h2>
        <p className="text-xs text-[#666]">R2 storage status dan informasi sistem</p>
      </div>

      <R2Status />

      {/* System Info */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Subtitle System</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#808080]">Providers</span>
            <span className="text-white">4 aktif (OS.com, OS.org, Subdl, Podnapisi)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#808080]">Search Mode</span>
            <span className="text-white">Parallel (semua provider sekaligus)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#808080]">Cache</span>
            <span className="text-white">R2 (auto-cache setelah download)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#808080]">Format</span>
            <span className="text-white">WebVTT (auto-convert dari SRT)</span>
          </div>
        </div>
      </div>


    </div>
  );
}
