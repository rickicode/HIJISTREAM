import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search as SearchIcon } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import api from '../utils/api';
import { useTranslation } from '../i18n';
import { colors, spacing } from '../theme';
import SearchBar from '../components/SearchBar';
import ContentGrid from '../components/ContentGrid';

export default function SearchScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = useCallback((q) => {
    setQuery(q);
  }, []);

  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', trimmed, locale],
    queryFn: () => api.search(trimmed, 1),
    enabled,
  });

  const items = data?.items || [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: t('nav.search') }} />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.text} size={26} />
        </TouchableOpacity>
        <View style={styles.searchWrapper}>
          <SearchBar onSearch={handleSearch} />
        </View>
      </View>

      {!enabled ? (
        <View style={styles.emptyState}>
          <SearchIcon color={colors.textMuted} size={48} />
          <Text style={styles.emptyText}>{t('common.searchPlaceholder')}</Text>
        </View>
      ) : !isLoading && items.length === 0 && !error ? (
        <View style={styles.emptyState}>
          <SearchIcon color={colors.textMuted} size={48} />
          <Text style={styles.emptyText}>{t('common.noResults')}</Text>
        </View>
      ) : (
        <ContentGrid
          items={items}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
