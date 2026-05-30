import { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing } from '@hijistream/shared/theme';
import api from '@hijistream/shared/utils/api';
import { getAllWatchProgress } from '@hijistream/shared/utils/player';
import HeroBanner from '../../components/HeroBanner';
import ContentRail from '../../components/ContentRail';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const [sections, setSections] = useState([]);
  const [heroItems, setHeroItems] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [trending, trendingTV, onAir, animeTrending, animeOngoing, progress] = await Promise.all([
        api.getTrendingMovies(),
        api.getTrendingTV(),
        api.getTVOnTheAir(),
        api.getAnimeTrending(),
        api.getAnimeOngoing(),
        getAllWatchProgress(),
      ]);

      if (trending?.items?.length > 0) {
        setHeroItems(trending.items.slice(0, 5));
      }

      const newSections = [];

      if (progress.length > 0) {
        newSections.push({
          id: 'continue-watching',
          title: 'Continue Watching',
          data: progress.map(p => ({
            id: p.id,
            title: p.title,
            poster_url: p.poster_url,
            type: p.type,
            progress: p.percentage,
          })),
          type: 'continue',
        });
      }

      if (trending?.items) {
        newSections.push({ id: 'trending-movies', title: 'Trending Movies', data: trending.items, type: 'movie' });
      }
      if (trendingTV?.items) {
        newSections.push({ id: 'trending-tv', title: 'Trending TV', data: trendingTV.items, type: 'tv' });
      }
      if (onAir?.items) {
        newSections.push({ id: 'on-the-air', title: 'On Air', data: onAir.items, type: 'tv' });
      }
      if (animeTrending?.items) {
        newSections.push({ id: 'anime-trending', title: 'Trending Anime', data: animeTrending.items, type: 'tv' });
      }
      if (animeOngoing?.items) {
        newSections.push({ id: 'anime-ongoing', title: 'Ongoing Anime', data: animeOngoing.items, type: 'tv' });
      }

      setSections(newSections);
    } catch (err) {
      console.error('Failed to load home data:', err);
    }
  }

  const renderSection = ({ item }) => (
    <ContentRail
      title={item.title}
      data={item.data}
      type={item.type}
      listId={item.id}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderSection}
        ListHeaderComponent={
          heroItems.length > 0 ? <HeroBanner items={heroItems} /> : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
});
