/**
 * BrowseScreen — TV-optimized browse by genre or country
 *
 * Features:
 * - Genre cards with unique emoji + rich background colors
 * - Country cards with large flags
 * - Large, TV-friendly layout (readable from 3m away)
 * - Red focus ring on all items
 * - Smooth tab switching with TV remote
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, BackHandler, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@hijistream/shared/theme';
import { GENRE_IDS, TMDB_COUNTRIES } from '@hijistream/shared/utils/api';
import { useTranslation } from '@hijistream/shared/i18n';
import TVFocusable from '../../components/TVFocusable';
import TVTopNav from '../../components/TVTopNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 48;
const GRID_GAP = 12;
const COLUMNS = 6;
const CARD_WIDTH = (SCREEN_WIDTH - (2 * GRID_PADDING) - ((COLUMNS - 1) * GRID_GAP)) / COLUMNS;

/* ── Genre metadata with emoji + color for TV-friendly cards ── */
const GENRE_META = {
  action:        { emoji: '💥', color: '#DC2626', gradient: ['#DC2626', '#991B1B'] },
  adventure:     { emoji: '🗺️', color: '#D97706', gradient: ['#D97706', '#92400E'] },
  animation:     { emoji: '✨', color: '#7C3AED', gradient: ['#7C3AED', '#4C1D95'] },
  comedy:        { emoji: '😂', color: '#059669', gradient: ['#059669', '#065F46'] },
  crime:         { emoji: '🔍', color: '#1F2937', gradient: ['#1F2937', '#111827'] },
  documentary:   { emoji: '📽️', color: '#2563EB', gradient: ['#2563EB', '#1E3A5F'] },
  drama:         { emoji: '🎭', color: '#9333EA', gradient: ['#9333EA', '#5B21B6'] },
  family:        { emoji: '👨‍👩‍👧‍👦', color: '#EC4899', gradient: ['#EC4899', '#9D174D'] },
  fantasy:       { emoji: '🐉', color: '#6366F1', gradient: ['#6366F1', '#3730A3'] },
  history:       { emoji: '🏛️', color: '#92400E', gradient: ['#92400E', '#5C3A1E'] },
  horror:        { emoji: '👻', color: '#0F0F0F', gradient: ['#0F0F0F', '#1A1A2E'] },
  music:         { emoji: '🎵', color: '#DB2777', gradient: ['#DB2777', '#831843'] },
  mystery:       { emoji: '🔮', color: '#1E3A5F', gradient: ['#1E3A5F', '#0C1F33'] },
  romance:       { emoji: '💕', color: '#E11D48', gradient: ['#E11D48', '#881337'] },
  scienceFiction:{ emoji: '🚀', color: '#0284C7', gradient: ['#0284C7', '#0C4A6E'] },
  thriller:      { emoji: '🔪', color: '#374151', gradient: ['#374151', '#1F2937'] },
  war:           { emoji: '⚔️', color: '#57534E', gradient: ['#57534E', '#292524'] },
  western:       { emoji: '🤠', color: '#A16207', gradient: ['#A16207', '#713F12'] },
};

const GENRE_LIST = Object.entries(GENRE_IDS).map(([key, id]) => ({
  key,
  id,
  name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
  meta: GENRE_META[key] || { emoji: '🎬', color: '#1a1a1a', gradient: ['#1a1a1a', '#111'] },
}));

export default function BrowseScreen() {
  const [activeTab, setActiveTab] = useState('genre');
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  const handleGenrePress = useCallback((genreId) => {
    router.push({ pathname: '/genre/[id]', params: { id: genreId } });
  }, [router]);

  const handleCountryPress = useCallback((countryCode) => {
    router.push({ pathname: '/country/[id]', params: { id: countryCode } });
  }, [router]);

  /* ── Genre card with emoji + color block ── */
  const renderGenreItem = useCallback(({ item }) => (
    <View style={{ width: CARD_WIDTH }}>
      <TVFocusable
        onPress={() => handleGenrePress(item.id)}
        style={styles.gridCard}
        focusStyle={[styles.gridCardFocused, { backgroundColor: item.meta.color }]}
        focusScale={1.08}
        accessibilityLabel={item.name}
      >
        <View style={[styles.genreColorBar, { backgroundColor: item.meta.color }]} />
        <Text style={styles.genreEmoji}>{item.meta.emoji}</Text>
        <Text style={styles.gridCardText} numberOfLines={2}>
          {t(`genres.${item.key}`) || item.name}
        </Text>
      </TVFocusable>
    </View>
  ), [t, handleGenrePress]);

  /* ── Country card with large flag ── */
  const renderCountryItem = useCallback(({ item }) => (
    <View style={{ width: CARD_WIDTH }}>
      <TVFocusable
        onPress={() => handleCountryPress(item.iso)}
        style={styles.gridCard}
        focusStyle={styles.gridCardFocused}
        focusScale={1.08}
        accessibilityLabel={item.code.toUpperCase()}
      >
        <Text style={styles.countryFlag}>{item.flag}</Text>
        <Text style={styles.gridCardText}>{item.code.toUpperCase()}</Text>
      </TVFocusable>
    </View>
  ), [handleCountryPress]);

  const listKey = useMemo(() => activeTab, [activeTab]);

  return (
    <View style={styles.container}>
      <TVTopNav />
      <View style={styles.contentWrapper}>
        <Text style={styles.pageTitle}>Browse</Text>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <TVFocusable
            onPress={() => setActiveTab('genre')}
            style={[styles.tab, activeTab === 'genre' && styles.tabActive]}
            focusStyle={styles.tabFocused}
            focusScale={1.05}
            hasTVPreferredFocus={activeTab === 'genre'}
            accessibilityLabel="Browse by Genre"
          >
            {({ isFocused }) => (
              <Text style={[
                styles.tabText,
                activeTab === 'genre' && styles.tabTextActive,
                isFocused && styles.tabTextFocused
              ]}>
                📂 Genres
              </Text>
            )}
          </TVFocusable>
          <TVFocusable
            onPress={() => setActiveTab('country')}
            style={[styles.tab, activeTab === 'country' && styles.tabActive]}
            focusStyle={styles.tabFocused}
            focusScale={1.05}
            accessibilityLabel="Browse by Country"
          >
            {({ isFocused }) => (
              <Text style={[
                styles.tabText,
                activeTab === 'country' && styles.tabTextActive,
                isFocused && styles.tabTextFocused
              ]}>
                🌍 Countries
              </Text>
            )}
          </TVFocusable>
        </View>

        {/* Grid */}
        <FlatList
          key={listKey}
          data={activeTab === 'genre' ? GENRE_LIST : TMDB_COUNTRIES}
          renderItem={activeTab === 'genre' ? renderGenreItem : renderCountryItem}
          keyExtractor={(item) => String(item.id || item.iso)}
          numColumns={6}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 48,
    paddingTop: 8,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: -0.5,
  },

  /* ── Tabs ── */
  tabRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    borderColor: '#E50914',
  },
  tabFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b3b3b3',
    fontFamily: 'Inter_600SemiBold',
  },
  tabTextActive: {
    color: '#E50914',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  tabTextFocused: {
    color: '#000000',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },

  /* ── Grid ── */
  grid: {
    paddingBottom: 24,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },

  /* ── Genre card ── */
  gridCard: {
    flex: 1,
    minHeight: 110,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  gridCardFocused: {
    borderColor: '#ffffff',
  },
  genreColorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  genreEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  gridCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: 'Inter_700Bold',
  },

  /* ── Country card ── */
  countryFlag: {
    fontSize: 36,
    marginBottom: 6,
  },
});
