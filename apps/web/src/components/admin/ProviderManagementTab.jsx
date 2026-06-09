import { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, Loader, RefreshCw, Globe, Lock, Unlock, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import { PROVIDER_INFO } from '../../utils/subtitle-constants';

export default function ProviderManagementTab() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [checking, setChecking] = useState({});
  const [checkResults, setCheckResults] = useState({});
  const [saveMsgs, setSaveMsgs] = useState({});
  const [throttled, setThrottled] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminSettings();
      setSettings(data || {});
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (provider, field, value) => {
    setSettings(prev => ({
      ...prev,
      [provider]: { ...(prev[provider] || {}), [field]: value },
    }));
    setCheckResults(prev => ({ ...prev, [provider]: null }));
    setSaveMsgs(prev => ({ ...prev, [provider]: null }));
  };

  const handleSave = async (provider) => {
    setSaving(prev => ({ ...prev, [provider]: true }));
    setSaveMsgs(prev => ({ ...prev, [provider]: null }));
    try {
      await api.saveAdminSettings({ provider, ...settings[provider] });
      setSaveMsgs(prev => ({ ...prev, [provider]: { ok: true, text: 'Tersimpan!' } }));
    } catch (err) {
      setSaveMsgs(prev => ({ ...prev, [provider]: { ok: false, text: err.message } }));
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleCheck = async (provider) => {
    setChecking(prev => ({ ...prev, [provider]: true }));
    setCheckResults(prev => ({ ...prev, [provider]: null }));
    try {
      const res = await api.checkOSAccount({ provider, ...settings[provider] });
      setCheckResults(prev => ({ ...prev, [provider]: res }));
    } catch (err) {
      setCheckResults(prev => ({ ...prev, [provider]: { success: false, message: err.message } }));
    } finally {
      setChecking(prev => ({ ...prev, [provider]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={24} className="animate-spin text-[#E50914]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Settings size={16} className="text-[#E50914]" /> Provider Management
        </h2>
        <p className="text-xs text-[#666]">
          Konfigurasi kredensial subtitle provider. Provider dicoba secara paralel saat search.
        </p>
      </div>

      {/* Provider Cards */}
      {Object.entries(PROVIDER_INFO).map(([key, info]) => {
        const providerSettings = settings[key] || {};
        const isSaving = saving[key];
        const isChecking = checking[key];
        const checkResult = checkResults[key];
        const saveMsg = saveMsgs[key];
        const hasRequiredFields = info.fields.every(f => providerSettings[f.key]?.trim());

        return (
          <div key={key} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <span className="text-xl">{info.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{info.name}</h3>
                  <p className="text-[10px] text-[#666]">{info.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasRequiredFields ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                    <Unlock size={10} /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-[#666] bg-[#222] px-2 py-1 rounded-full">
                    <Lock size={10} /> Not configured
                  </span>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="p-4 space-y-3">
              {info.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs text-[#808080] mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={providerSettings[field.key] || ''}
                    onChange={(e) => handleFieldChange(key, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#E50914] transition-colors"
                  />
                </div>
              ))}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleSave(key)}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#E50914] text-white rounded hover:bg-[#f6121d] disabled:opacity-50 transition-colors"
                >
                  {isSaving ? <Loader size={12} className="animate-spin" /> : <Settings size={12} />}
                  Simpan
                </button>
                <button
                  onClick={() => handleCheck(key)}
                  disabled={isChecking || !hasRequiredFields}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#444] text-[#ccc] rounded hover:border-[#666] disabled:opacity-50 transition-colors"
                >
                  {isChecking ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Test Koneksi
                </button>
              </div>

              {/* Save message */}
              {saveMsg && (
                <div className={`flex items-center gap-1.5 text-xs ${saveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {saveMsg.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {saveMsg.text}
                </div>
              )}

              {/* Check result */}
              {checkResult && (
                <div className={`flex items-start gap-1.5 text-xs px-3 py-2 rounded border ${
                  checkResult.success
                    ? 'text-green-400 bg-green-400/10 border-green-400/20'
                    : 'text-red-400 bg-red-400/10 border-red-400/20'
                }`}>
                  {checkResult.success ? <CheckCircle size={12} className="mt-0.5 shrink-0" /> : <XCircle size={12} className="mt-0.5 shrink-0" />}
                  <span>{checkResult.message}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Provider Status Summary */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Provider Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(PROVIDER_INFO).map(([key, info]) => {
            const providerSettings = settings[key] || {};
            const hasConfig = info.fields.every(f => providerSettings[f.key]?.trim());
            return (
              <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                hasConfig ? 'border-green-400/20 bg-green-400/5' : 'border-[#333] bg-[#222]'
              }`}>
                <span className="text-lg">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{info.name}</p>
                  <p className={`text-[10px] ${hasConfig ? 'text-green-400' : 'text-[#666]'}`}>
                    {hasConfig ? 'Active' : 'Inactive'}
                  </p>
                </div>
                {hasConfig ? <CheckCircle size={14} className="text-green-400 shrink-0" /> : <XCircle size={14} className="text-[#555] shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="text-[11px] text-[#555] space-y-1">
        <p>• Provider dicoba secara paralel saat search subtitle</p>
        <p>• Provider pertama yang berhasil menang (prioritas: OS.com → OS.org → Subdl)</p>
        <p>• Auto-throttle aktif jika provider mengembalikan error (rate limit, dll)</p>
        <p>• Untuk OpenSubtitles.com: daftar di <a href="https://www.opensubtitles.com/consumers" target="_blank" rel="noopener noreferrer" className="text-[#808080] hover:text-white underline">opensubtitles.com</a></p>
        <p>• Untuk Subdl: daftar di <a href="https://subdl.com/api-doc" target="_blank" rel="noopener noreferrer" className="text-[#808080] hover:text-white underline">subdl.com</a></p>
      </div>
    </div>
  );
}
