import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`relative text-sm transition-colors ${
        isActive
          ? 'text-white font-medium'
          : 'text-[#A1A1A1] hover:text-white'
      }`}
    >
      {children}
      {isActive && (
        <span className="absolute -bottom-[19px] left-0 right-0 h-0.5 bg-[#6366F1] rounded-full" />
      )}
    </Link>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-[#0F0F0F] font-sans overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-[#0F0F0F]/80 glass border-b border-[#2E2E2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-[#6366F1]">
                HIJISTREAM
              </Link>
              <nav className="hidden sm:flex items-center gap-6">
                <NavLink to="/">Home</NavLink>
                <NavLink to="/movies">Movies</NavLink>
                <NavLink to="/tv">TV Shows</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/search')}
                className="p-2 rounded-lg text-[#A1A1A1] hover:text-white hover:bg-[#262626] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg text-[#A1A1A1] hover:text-white hover:bg-[#262626] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[#2E2E2E] bg-[#1A1A1A]">
            <nav className="flex flex-col px-4 py-3 gap-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-[#262626] transition-colors"
              >
                Home
              </Link>
              <Link
                to="/movies"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-[#262626] transition-colors"
              >
                Movies
              </Link>
              <Link
                to="/tv"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-[#262626] transition-colors"
              >
                TV Shows
              </Link>
            </nav>
          </div>
        )}
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-[#2E2E2E] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6B6B6B]">HIJISTREAM - Stream Movies & TV Shows</p>
            <button
              onClick={() => { localStorage.clear(); queryClient.clear(); window.location.reload(); }}
              className="text-xs text-[#6B6B6B] hover:text-[#A1A1A1] transition-colors"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
