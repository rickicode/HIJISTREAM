import { useState } from 'react';
import api from '../../utils/api';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Username dan password harus diisi');
      return;
    }
    setLoading(true);
    api.setAdminAuth(username, password);
    try {
      await api.getAdminSubtitles();
      onLogin();
    } catch (err) {
      setError(err.message === 'Unauthorized' ? 'Username atau password salah' : 'Gagal terhubung ke server');
      api.clearAdminAuth();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-[#E50914]">HIJI</span>
            <span className="text-white">STREAM</span>
          </h1>
          <p className="text-[#b3b3b3] mt-2 text-sm font-medium tracking-wide uppercase">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-8 shadow-xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#b3b3b3] mb-1.5" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#141414] border border-[#333] rounded text-white placeholder-[#666] focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] transition-colors"
                placeholder="Enter admin username"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#b3b3b3] mb-1.5" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#141414] border border-[#333] rounded text-white placeholder-[#666] focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] transition-colors"
                placeholder="Enter admin password"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded px-4 py-2.5">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-2.5 bg-[#E50914] text-white font-semibold rounded hover:bg-[#f6121d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><RefreshCw size={16} className="animate-spin" /> Verifying...</>
            ) : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
