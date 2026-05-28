import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import api, { TMDB_COUNTRIES, SORT_OPTIONS } from '../../utils/api';
import { useTranslation } from '../../i18n';
import { colors, spacing, typography } from '../../theme';
import TabBar from '../../components/TabBar';
import ContentGrid from '../../components/ContentGrid';

export default function CountryDetailScreen() {
  const { code } = useLocalSearchParams();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [sortBy, setSortBy] = useState('popularity.desc');

  const country = TMDB_COUNTRIES.find((c) => c.iso === code);
  const countryName = country ? t(`countries.${country.code}`) : code;
  const flag = country ? country.flag : '';

  const sortTabs = SORT_OPTIONS.map((opt) => ({ id: opt.id, label: t(opt.label) }));

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
      <TabBar tabs={sortTabs} activeTab={sortBy} onTabChange={setSortBy} />
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
});
