import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import api, { TMDB_COUNTRIES, SORT_OPTIONS } from '../../utils/api';
import { useTranslation } from '../../i18n';
import { colors, spacing, typography } from '../../theme';
import ContentGrid from '../../components/ContentGrid';

export default function CountryDetailScreen() {
  const { code } = useLocalSearchParams();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [sortBy, setSortBy] = useState('popularity.desc');

  const country = TMDB_COUNTRIES.find((c) => c.iso === code);
  const countryName = country ? t(`countries.${country.code}`) : code;
  const flag = country ? country.flag : '';

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['country-detail', code, locale, sortBy],
    queryFn: ({ pageParam }) =>
      api.getDiscoverByCountry('movie', code, pageParam, sortBy),
    getNextPageParam: (lastPage) =>
      lastPage?.items?.length && lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
    initialPageParam: 1,
  });

  const items = data?.pages?.flatMap((page) => page.items || []) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{flag} {countryName}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => setSortBy(option.id)}
            style={[
              styles.filterPill,
              sortBy === option.id ? styles.filterPillActive : styles.filterPillInactive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                sortBy === option.id ? styles.filterTextActive : styles.filterTextInactive,
              ]}
            >
              {t(option.label)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ContentGrid
        items={items}
        type="movie"
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onEndReached={fetchNextPage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  filterRow: {
    maxHeight: 48,
    marginBottom: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#e50914',
  },
  filterPillInactive: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterTextInactive: {
    color: '#aaa',
  },
});
