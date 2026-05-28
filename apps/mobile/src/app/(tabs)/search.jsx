import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react-native';
import api from '../../utils/api';
import { colors, spacing, typography } from '../../theme';
import SearchBar from '../../components/SearchBar';
import ContentGrid from '../../components/ContentGrid';

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  const handleSearch = useCallback((text) => {
    setQuery(text.trim());
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.search(query),
    enabled: query.length > 0,
  });

  const items = data?.items
    ? data.items.map((item) => {
        const itemType =
          item.type || (item.number_of_seasons != null || item.media_type === 'tv' ? 'tv' : 'movie');
        return { ...item, _detectedType: itemType };
      })
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar onSearch={handleSearch} />
      </View>

      {query.length === 0 ? (
        <View style={styles.emptyState}>
          <SearchIcon color={colors.textMuted} size={48} />
          <Text style={styles.emptyText}>Start typing to search</Text>
        </View>
      ) : items.length === 0 && !isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.noResultsText}>
            No results found for &apos;{query}&apos;
          </Text>
        </View>
      ) : (
        <ContentGrid
          items={items}
          type="movie"
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    ...typography.subtitle,
  },
  noResultsText: {
    color: colors.textMuted,
    ...typography.subtitle,
  },
});
