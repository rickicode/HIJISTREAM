import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={cn(
        'text-sm transition-colors',
        isActive ? 'text-white font-medium' : 'text-muted-foreground hover:text-white'
      )}
    >
      {children}
    </Link>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const queryClient = useQueryClient();

  useKeyboardShortcuts();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-colors duration-300',
          scrolled ? 'bg-background/95 backdrop-blur' : 'bg-transparent'
        )}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-primary">
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
                className="p-2 rounded text-muted-foreground hover:text-white transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded text-muted-foreground hover:text-white transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden bg-background-elevated border-t border-border">
            <nav className="flex flex-col px-4 py-3 gap-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/movies"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Movies
              </Link>
              <Link
                to="/tv"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded text-sm font-medium text-white hover:bg-white/10 transition-colors"
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
      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">HIJISTREAM</p>
            <button
              onClick={() => { localStorage.clear(); queryClient.clear(); window.location.reload(); }}
              className="text-xs text-muted hover:text-muted-foreground transition-colors"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
