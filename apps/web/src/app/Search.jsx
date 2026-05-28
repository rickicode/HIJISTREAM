import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import api from '../utils/api';
import { useTranslation } from '../i18n';
import SearchBar from '../components/SearchBar';
import ContentGrid from '../components/ContentGrid';

export default function Search() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const { t, locale } = useTranslation();

  useEffect(() => {
    document.title = `${t('nav.search')} - HIJISTREAM`;
  }, [t]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', query, locale],
    queryFn: () => api.search(query),
    enabled: query.length > 0,
  });

  const handleSearch = useCallback((value) => {
    setQuery(value);
  }, []);

  const items = data?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      <div className="mb-8">
        <SearchBar onSearch={handleSearch} initialQuery={initialQuery || query} />
      </div>

      {!query && (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <SearchIcon className="text-muted mb-4" size={48} />
          <p className="text-muted-foreground text-sm">
            {t('common.noResults')}
          </p>
        </div>
      )}

      {query && !isLoading && items.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <p className="text-muted-foreground text-sm">
            {t('common.noResults')}
          </p>
        </div>
      )}

      {query && (
        <ContentGrid
          items={items}
          type="mixed"
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
        />
      )}
    </div>
  );
}
