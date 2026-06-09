/**
 * ListScreen - "See All" list page for Android TV
 *
 * Features:
 * - Full paginated content list
 * - TV remote D-pad navigation
 * - Back button support
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '@hijistream/shared/utils/api';
import { getAllWatchProgress } from '@hijistream/shared/utils/player';
import { colors } from '@hijistream/shared/theme';
import ContentCard from '../../components/ContentCard';

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
      <ContentCard item={item} type={item.type || mediaType} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{TITLE_MAP[listType] || 'Browse'}</Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        numColumns={5}
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
    padding: 56,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  grid: {
    paddingBottom: 48,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '20%',
    alignItems: 'center',
  },
});
