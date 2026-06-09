/**
 * HomeScreen - Netflix-style home page for Android TV
 *
 * Features:
 * - HeroBanner carousel at top
 * - Content rails: Continue Watching, Trending, On Air, Anime
 * - All sections scrollable vertically with TV remote
 * - Each rail scrollable horizontally with TV remote
 */

import { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { colors } from '@hijistream/shared/theme';
import api from '@hijistream/shared/utils/api';
import { getAllWatchProgress } from '@hijistream/shared/utils/player';
import HeroBanner from '../../components/HeroBanner';
import ContentRail from '../../components/ContentRail';

export default function HomeScreen() {
  const [sections, setSections] = useState([]);
  const [heroItems, setHeroItems] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [trending, trendingTV, onAir, animeTrending, animeOngoing, popular, progress] = await Promise.all([
        api.getTrendingMovies(),
        api.getTrendingTV(),
        api.getTVOnTheAir(),
        api.getAnimeTrending(),
        api.getAnimeOngoing(),
        api.getPopularMovies(),
        getAllWatchProgress(),
      ]);

      // Hero: mix of trending movies + TV
      const heroMix = [];
      if (trending?.items?.length > 0) heroMix.push(...trending.items.slice(0, 3));
      if (trendingTV?.items?.length > 0) heroMix.push(...trendingTV.items.slice(0, 2));
      setHeroItems(heroMix.slice(0, 5));

      const newSections = [];

      // Continue Watching first
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
          type: 'movie',
        });
      }

      // Trending Movies
      if (trending?.items) {
        newSections.push({
          id: 'trending-movies',
          title: 'Trending Now',
          data: trending.items,
          type: 'movie',
        });
      }

      // Popular Movies
      if (popular?.items) {
        newSections.push({
          id: 'popular-movies',
          title: 'Popular on HIJISTREAM',
          data: popular.items,
          type: 'movie',
        });
      }

      // Trending TV
      if (trendingTV?.items) {
        newSections.push({
          id: 'trending-tv',
          title: 'Trending TV Shows',
          data: trendingTV.items,
          type: 'tv',
        });
      }

      // On Air
      if (onAir?.items) {
        newSections.push({
          id: 'on-the-air',
          title: 'On Air This Week',
          data: onAir.items,
          type: 'tv',
        });
      }

      // Anime
      if (animeTrending?.items) {
        newSections.push({
          id: 'anime-trending',
          title: 'Trending Anime',
          data: animeTrending.items,
          type: 'tv',
        });
      }
      if (animeOngoing?.items) {
        newSections.push({
          id: 'anime-ongoing',
          title: 'Ongoing Anime Series',
          data: animeOngoing.items,
          type: 'tv',
        });
      }

      setSections(newSections);
    } catch (err) {
      console.error('Failed to load home data:', err);
    }
  }, []);

  const renderSection = useCallback(({ item }) => (
    <ContentRail
      title={item.title}
      data={item.data}
      type={item.type}
      listId={item.id}
    />
  ), []);

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderSection}
        ListHeaderComponent={
          heroItems.length > 0 ? (
            <View style={styles.heroContainer}>
              <HeroBanner items={heroItems} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        // TV optimization
        removeClippedSubviews={false}
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
    paddingBottom: 48,
  },
  heroContainer: {
    marginBottom: 0,
  },
});
