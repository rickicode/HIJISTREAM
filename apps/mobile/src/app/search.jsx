import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search as SearchIcon, Play, Clock, X, TrendingUp } from 'lucide-react-native';
import api from '@hijistream/shared/utils/api';
import storage from '@hijistream/shared/utils/storage';
import { useTranslation } from '@hijistream/shared/i18n';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import SearchBar from '../components/SearchBar';
import ContentGrid from '../components/ContentGrid';

const RECENT_KEY = 'recent_searches';
const RECENT_MAX = 8;

/**
 * A single "list" style result row (Netflix "Top Searches" pattern):
 * wide thumbnail + title + a play affordance.
 */
function ResultRow({ item, onPress }) {
  const thumb = item.backdrop_url || item.poster_url;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <Image source={{ uri: thumb }} style={styles.rowThumb} resizeMode="cover" />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
        {!!item.year && <Text style={styles.rowMeta}>{item.year}</Text>}
      </View>
      <View style={styles.rowPlay}>
        <Play color={colors.text} size={18} fill={colors.text} />
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState([]);

  // Debounce raw input into the actual query used for fetching.
  useEffect(() => {
    const id = setTimeout(() => setQuery(input), 300);
    return () => clearTimeout(id);
  }, [input]);

  // Load recent searches once.
  useEffect(() => {
    storage.getItem(RECENT_KEY).then((saved) => {
      if (Array.isArray(saved)) setRecent(saved);
    });
  }, []);

  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  const { data, isLoading, error, refetch, isSuccess } = useQuery({
    queryKey: ['search', trimmed, locale],
    queryFn: () => api.search(trimmed, 1),
    enabled,
  });

  const items = data?.items || [];

  // Suggestions shown when there's no active query — trending titles.
  const { data: trendingData } = useQuery({
    queryKey: ['search-trending', locale],
    queryFn: () => api.getTrendingMovies(1),
    enabled: !enabled,
  });
  const suggestions = (trendingData?.items || []).slice(0, 10);

  // Persist a successful search term into recent history.
  useEffect(() => {
    if (!isSuccess || !enabled || items.length === 0) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, RECENT_MAX);
      storage.setItem(RECENT_KEY, next);
      return next;
    });
  }, [isSuccess, enabled, trimmed]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeRecent = useCallback((term) => {
    setRecent((prev) => {
      const next = prev.filter((q) => q !== term);
      storage.setItem(RECENT_KEY, next);
      return next;
    });
  }, []);

  const openItem = useCallback(
    (item) => {
      const id = item.id || item.tmdb_id;
      const type = item._detectedType || item.type || 'movie';
      router.push(type === 'tv' ? `/tv/${id}` : `/movie/${id}`);
    },
    [router]
  );

  const showResults = enabled;
  const showEmptyResults = enabled && !isLoading && !error && items.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel={t('common.closeSearch')}
        >
          <ChevronLeft color={colors.text} size={26} />
        </Pressable>
        <View style={styles.searchWrapper}>
          <SearchBar
            value={input}
            onChangeText={setInput}
            onClear={() => setInput('')}
            autoFocus
          />
        </View>
      </View>

      {showEmptyResults ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <SearchIcon color={colors.textMuted} size={36} />
          </View>
          <Text style={styles.emptyTitle}>{t('common.noResults')}</Text>
          <Text style={styles.emptySubtitle} numberOfLines={2}>
            &ldquo;{trimmed}&rdquo;
          </Text>
        </View>
      ) : showResults ? (
        <ContentGrid items={items} isLoading={isLoading} error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.browseContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {recent.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('common.recentSearches')}</Text>
              {recent.map((term) => (
                <Pressable
                  key={term}
                  onPress={() => setInput(term)}
                  style={({ pressed }) => [styles.recentRow, pressed && styles.rowPressed]}
                >
                  <Clock color={colors.textMuted} size={18} />
                  <Text style={styles.recentText} numberOfLines={1}>{term}</Text>
                  <Pressable
                    onPress={() => removeRecent(term)}
                    hitSlop={10}
                    style={styles.recentRemove}
                    accessibilityLabel={t('common.closeSearch')}
                  >
                    <X color={colors.textMuted} size={16} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}

          {suggestions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <TrendingUp color={colors.text} size={18} />
                <Text style={styles.sectionTitle}>{t('common.trending')}</Text>
              </View>
              {suggestions.map((item) => (
                <ResultRow
                  key={String(item.id || item.tmdb_id)}
                  item={item}
                  onPress={() => openItem(item)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    flex: 1,
  },

  // ---- Browse (no query) ----
  browseContent: {
    paddingBottom: spacing.xxl,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  recentText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 16,
  },
  recentRemove: {
    padding: 4,
  },

  // ---- Result row ----
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.md,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowThumb: {
    width: 110,
    height: 64,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundElevated,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  rowPlay: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Empty results ----
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
});
