import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Search, Menu, X, ChevronDown, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import Logo from './Logo';
import SearchModal from './SearchModal';
import { useTranslation } from '../i18n';
import { SUPPORTED_LOCALES } from '../i18n/locales';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const { t, locale, setLocale } = useTranslation();
  const queryClient = useQueryClient();
  const dropdownRef = useRef(null);

  useKeyboardShortcuts({ onSearchOpen: () => setSearchModalOpen(true) });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const currentLocale = SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];

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
              <Logo />
              <nav className="hidden sm:flex items-center gap-6">
                <NavLink to="/">{t('nav.home')}</NavLink>
                <NavLink to="/movies">{t('nav.movies')}</NavLink>
                <NavLink to="/tv">{t('nav.tvShows')}</NavLink>
                <NavLink to="/anime">{t('nav.anime')}</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchModalOpen(true)}
                className="p-2 rounded text-muted-foreground hover:text-white transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded text-sm font-medium text-muted-foreground hover:text-white transition-colors"
                >
                  <span>{currentLocale.flag}</span>
                  <span className="hidden sm:inline">{currentLocale.code.toUpperCase()}</span>
                  <ChevronDown size={14} />
                </button>
                {langDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-[#1a1a1a] rounded-lg shadow-xl border border-border py-2 min-w-[200px] z-50">
                    {SUPPORTED_LOCALES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLocale(lang.code);
                          setLangDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 hover:bg-white/10 flex items-center gap-3 text-left transition-colors"
                      >
                        <span>{lang.flag}</span>
                        <span className="text-white text-sm">{lang.nativeName}</span>
                        {locale === lang.code && (
                          <Check size={14} className="ml-auto text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                {t('nav.home')}
              </Link>
              <Link
                to="/movies"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                {t('nav.movies')}
              </Link>
              <Link
                to="/tv"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                {t('nav.tvShows')}
              </Link>
              <Link
                to="/anime"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                {t('nav.anime')}
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
      <SearchModal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </div>
  );
}
