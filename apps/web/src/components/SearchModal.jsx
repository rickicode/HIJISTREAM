import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Clock, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useTranslation } from '../i18n';
import { cn } from '@/lib/utils';

const SEARCH_HISTORY_KEY = 'hijistream_search_history';

function getSearchHistory() {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(history) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  } catch {
    // ignore
  }
}

export default function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [history, setHistory] = useState(getSearchHistory);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();
  const { t, locale } = useTranslation();

  useEffect(() => {
    if (open) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setVisible(false);
        setQuery('');
        setDebouncedQuery('');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleQueryChange = useCallback((value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
      if (value.trim()) {
        const updated = [value.trim(), ...getSearchHistory().filter((q) => q !== value.trim())].slice(0, 10);
        setHistory(updated);
        saveSearchHistory(updated);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['search-modal', debouncedQuery, locale],
    queryFn: () => api.search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const items = data?.items || [];

  const handleResultClick = (item) => {
    const effectiveType = item.type || item._detectedType || 'movie';
    const itemId = item.id || item.tmdb_id;
    const path = effectiveType === 'movie' ? `/movies/${itemId}` : `/tv/${itemId}`;
    onClose();
    navigate(path);
  };

  const handleHistoryClick = (term) => {
    setQuery(term);
    setDebouncedQuery(term);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!visible && !open) return null;

  const showHistory = query === '' && history.length > 0;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col transition-opacity duration-200',
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-3xl mx-auto mt-20 px-4 flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg border border-border p-3">
          <Search size={20} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t('common.searchPlaceholder')}
            className="flex-1 bg-transparent text-white text-base placeholder:text-muted outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setDebouncedQuery(''); inputRef.current?.focus(); }}
              className="text-muted hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-2 px-3 py-1 text-xs text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
          >
            ESC
          </button>
        </div>

        <div className="mt-3 overflow-y-auto flex-1 rounded-lg">
          {isLoading && debouncedQuery && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {showHistory && (
            <div className="bg-[#1a1a1a] rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-2.5 text-xs text-muted font-medium">
                {t('common.recentSearches')}
              </div>
              {history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleHistoryClick(item)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-white transition-colors text-left"
                >
                  <Clock size={14} className="text-muted shrink-0" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          )}

          {!isLoading && debouncedQuery && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-sm">{t('common.noResults')}</p>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((item) => (
                <ResultCard key={item.id || item.tmdb_id} item={item} onClick={handleResultClick} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ item, onClick }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      onClick={() => onClick(item)}
      className="group text-left rounded-sm overflow-hidden bg-[#1a1a1a] hover:bg-white/10 transition-colors"
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        ) : (
          <div className="w-full h-full bg-background-elevated flex items-center justify-center">
            <span className="text-muted text-xs text-center px-2">{item.title}</span>
          </div>
        )}
        {item.poster_url && !imgLoaded && (
          <div className="absolute inset-0 shimmer-bg animate-shimmer" />
        )}
      </div>
      <div className="p-2">
        <h3 className="text-sm text-white truncate">{item.title}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {item.year && <span className="text-xs text-muted-foreground">{item.year}</span>}
          {item.rating && item.rating !== '0.0' && (
            <span className="text-xs text-muted-foreground">
              <span className="text-yellow-400">&#9733;</span> {item.rating}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
