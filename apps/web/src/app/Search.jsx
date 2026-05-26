import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import api from '../utils/api';
import SearchBar from '../components/SearchBar';
import ContentGrid from '../components/ContentGrid';

export default function Search() {
  const [query, setQuery] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.search(query),
    enabled: query.length > 0,
  });

  const handleSearch = useCallback((value) => {
    setQuery(value);
  }, []);

  const items = data?.items || (Array.isArray(data) ? data : []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <SearchBar onSearch={handleSearch} initialQuery={query} />
      </div>

      {!query && (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <SearchIcon className="text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-sm">
            Start typing to search movies and TV shows
          </p>
        </div>
      )}

      {query && !isLoading && items.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <p className="text-gray-500 text-sm">
            No results found for &apos;{query}&apos;
          </p>
        </div>
      )}

      {query && (
        <ContentGrid
          items={items}
          type="movie"
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
        />
      )}
    </div>
  );
}
