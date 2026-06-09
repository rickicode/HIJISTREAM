/**
 * ListScreen - "See All" list page for Android TV
 *
 * Features:
 * - Header bar with Back button and Title
 * - Full paginated content list in a compact 6-column grid
 * - TV remote D-pad navigation
 * - Back button support
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, BackHandler, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '@hijistream/shared/utils/api';
import { getAllWatchProgress } from '@hijistream/shared/utils/player';
import { colors } from '@hijistream/shared/theme';
import { ArrowLeft } from 'lucide-react-native';
import TVFocusable from '../../components/TVFocusable';
import ContentCard from '../../components/ContentCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 48;
const GRID_GAP = 12;
const COLUMNS = 6;
const CARD_WIDTH = (SCREEN_WIDTH - (2 * GRID_PADDING) - ((COLUMNS - 1) * GRID_GAP)) / COLUMNS;

const TITLE_MAP = {
  'trending-movies': 'Trending Now',
  'trending-tv': 'Trending TV Shows',
  'popular-movies': 'Popular on HIJISTREAM',
  'on-the-air': 'On Air This Week',
  'anime-trending': 'Trending Anime',
  'anime-ongoing': 'Ongoing Anime Series',
  'continue-watching': 'Continue Watching',
};

export default function ListScreen() {
  const { type: listType } = useLocalSearchParams();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageRef = useRef(1); // Guard against out-of-order responses

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    pageRef.current = 1;
    setPage(1);
    loadData(1);
  }, [listType]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async (requestedPage) => {
    // Guard: ignore if response is for an older request
    if (requestedPage < pageRef.current) return;
    
    try {
      setLoading(true);
      let data;
      switch (listType) {
        case 'trending-movies':
          data = await api.getTrendingMovies(requestedPage);
          break;
        case 'trending-tv':
          data = await api.getTrendingTV(requestedPage);
          break;
        case 'popular-movies':
          data = await api.getPopularMovies(requestedPage);
          break;
        case 'on-the-air':
          data = await api.getTVOnTheAir(requestedPage);
          break;
        case 'anime-trending':
          data = await api.getAnimeTrending(requestedPage);
          break;
        case 'anime-ongoing':
          data = await api.getAnimeOngoing(requestedPage);
          break;
        case 'continue-watching':
          const progress = await getAllWatchProgress();
          setItems(progress.map(p => ({
            id: p.id,
            title: p.title,
            poster_url: p.poster_url,
            type: p.type,
            progress: p.percentage,
          })));
          setLoading(false);
          return;
        default:
          data = await api.getTrendingMovies(requestedPage);
      }

      if (requestedPage === 1) {
        setItems(data?.items || []);
      } else {
        setItems(prev => [...prev, ...(data?.items || [])]);
      }
      pageRef.current = requestedPage;
    } catch (err) {
      console.error('Failed to load list:', err);
    } finally {
      setLoading(false);
    }
  }, [listType]);

  const handleLoadMore = useCallback(() => {
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    setPage(nextPage);
    loadData(nextPage);
  }, [loadData]);

  const mediaType = listType?.includes('tv') || listType?.includes('air') || listType?.includes('anime') ? 'tv' : 'movie';

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <ContentCard item={item} type={item.type || mediaType} width="100%" />
    </View>
  );

  if (items.length === 0 && loading) {
    return (
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TVFocusable
            onPress={() => router.back()}
            style={styles.backButton}
            focusStyle={styles.backButtonFocused}
            focusScale={1.05}
            showFocusRing={false}
            accessibilityLabel="Go back"
            hasTVPreferredFocus
          >
            {({ isFocused }) => (
              <ArrowLeft size={18} color={isFocused ? '#000' : '#fff'} />
            )}
          </TVFocusable>
          <Text style={styles.title}>{TITLE_MAP[listType] || 'Browse'}</Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>HIJISTREAM</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TVFocusable
          onPress={() => router.back()}
          style={styles.backButton}
          focusStyle={styles.backButtonFocused}
          focusScale={1.05}
          showFocusRing={false}
          accessibilityLabel="Go back"
          hasTVPreferredFocus
        >
          {({ isFocused }) => (
            <ArrowLeft size={18} color={isFocused ? '#000' : '#fff'} />
          )}
        </TVFocusable>
        <Text style={styles.title}>{TITLE_MAP[listType] || 'Browse'}</Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        numColumns={6}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        onEndReached={listType !== 'continue-watching' ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 48,
    paddingTop: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    height: 48,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  backButtonFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    fontFamily: 'Inter_700Bold',
  },
  grid: {
    paddingBottom: 32,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E50914',
    letterSpacing: 2,
    marginTop: 10,
    fontFamily: 'Inter_700Bold',
  },
});
