import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '@hijistream/shared/utils/api';
import { getAllWatchProgress } from '@hijistream/shared/utils/player';
import { colors, spacing } from '@hijistream/shared/theme';
import ContentCard from '../../components/ContentCard';

const TITLE_MAP = {
  'trending-movies': 'Trending Movies',
  'trending-tv': 'Trending TV',
  'on-the-air': 'On Air',
  'anime-trending': 'Trending Anime',
  'anime-ongoing': 'Ongoing Anime',
  'continue-watching': 'Continue Watching',
};

export default function ListScreen() {
  const { type: listType } = useLocalSearchParams();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [listType, page]);

  async function loadData() {
    try {
      setLoading(true);
      let data;
      switch (listType) {
        case 'trending-movies':
          data = await api.getTrendingMovies(page);
          break;
        case 'trending-tv':
          data = await api.getTrendingTV(page);
          break;
        case 'on-the-air':
          data = await api.getTVOnTheAir(page);
          break;
        case 'anime-trending':
          data = await api.getAnimeTrending(page);
          break;
        case 'anime-ongoing':
          data = await api.getAnimeOngoing(page);
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
          data = await api.getTrendingMovies(page);
      }

      if (page === 1) {
        setItems(data?.items || []);
      } else {
        setItems(prev => [...prev, ...(data?.items || [])]);
      }
    } catch (err) {
      console.error('Failed to load list:', err);
    } finally {
      setLoading(false);
    }
  }

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
        onEndReached={listType !== 'continue-watching' ? () => setPage(p => p + 1) : undefined}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  grid: {
    paddingBottom: spacing.xl,
  },
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '20%',
  },
});
