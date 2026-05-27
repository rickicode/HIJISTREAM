import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock } from 'lucide-react';

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

export default function SearchBar({ onSearch, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState(getSearchHistory);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const debouncedSearch = useCallback(
    (value) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value.trim()) {
          onSearch(value.trim());
          const updated = [value.trim(), ...history.filter((q) => q !== value.trim())].slice(0, 10);
          setHistory(updated);
          saveSearchHistory(updated);
        } else {
          onSearch('');
        }
      }, 300);
    },
    [onSearch, history]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  const handleHistoryClick = (item) => {
    setQuery(item);
    onSearch(item);
    setIsFocused(false);
  };

  const showHistory = isFocused && query === '' && history.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search movies and TV shows..."
          className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder:text-[#6B6B6B] focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] outline-none transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {showHistory && (
        <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="px-4 py-2 text-xs text-[#6B6B6B] font-medium">Recent Searches</div>
          {history.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleHistoryClick(item)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#A1A1A1] hover:bg-[#262626] hover:text-white transition-colors text-left"
            >
              <Clock size={14} className="text-[#6B6B6B] shrink-0" />
              <span className="truncate">{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
