import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Film } from 'lucide-react-native';
import api from '../../utils/api';
import { getAllWatchProgress } from '../../utils/player';
import ContentCard from '../../components/ContentCard';
import TVFocusable from '../../components/TVFocusable';
import LoadingState from '../../components/LoadingState';

export default function HomeScreen() {
  const router = useRouter();
  const [watchProgress, setWatchProgress] = useState([]);

  const loadProgress = useCallback(async () => {
    const progress = await getAllWatchProgress();
    setWatchProgress(progress);
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const { data: trendingMovies, isLoading: moviesLoading } = useQuery({
    queryKey: ['trending-movies-home'],
    queryFn: () => api.getTrendingMovies(1),
  });

  const { data: trendingTV, isLoading: tvLoading } = useQuery({
    queryKey: ['trending-tv-home'],
    queryFn: () => api.getTrendingTV(1),
  });

  const movies = trendingMovies?.items?.slice(0, 8) || [];
  const tvShows = trendingTV?.items?.slice(0, 8) || [];

  const sections = [];

  if (watchProgress.length > 0) {
    sections.push({ key: 'continue-watching', type: 'progress' });
  } else {
    sections.push({ key: 'empty-state', type: 'empty' });
  }

  sections.push({ key: 'trending-movies', type: 'movies' });
  sections.push({ key: 'trending-tv', type: 'tv' });

  const renderSection = ({ item: section }) => {
    if (section.type === 'empty') {
      return (
        <View style={styles.emptyState}>
          <Film color="#6B7280" size={48} />
          <Text style={styles.emptyTitle}>Welcome to HIJISTREAM</Text>
          <Text style={styles.emptySubtitle}>
            Start watching movies and TV shows
          </Text>
          <TVFocusable
            onPress={() => router.push('/(tabs)/movies')}
            style={styles.browseButton}
          >
            <Text style={styles.browseButtonText}>Browse Movies</Text>
          </TVFocusable>
        </View>
      );
    }

    if (section.type === 'progress') {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Continue Watching</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {watchProgress.map((item) => (
              <View key={item.id} style={styles.cardWrapper}>
                <ContentCard
                  item={item}
                  type={item.type || 'movie'}
                  watchProgress={item.percentage}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (section.type === 'movies') {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Movies</Text>
            <TVFocusable
              onPress={() => router.push('/(tabs)/movies')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TVFocusable>
          </View>
          {moviesLoading ? (
            <LoadingState type="card" />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {movies.map((item) => (
                <View key={String(item.id || item.tmdb_id)} style={styles.cardWrapper}>
                  <ContentCard item={item} type={item.type || 'movie'} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      );
    }

    if (section.type === 'tv') {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending TV Shows</Text>
            <TVFocusable
              onPress={() => router.push('/(tabs)/tv')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TVFocusable>
          </View>
          {tvLoading ? (
            <LoadingState type="card" />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {tvShows.map((item) => (
                <View key={String(item.id || item.tmdb_id)} style={styles.cardWrapper}>
                  <ContentCard item={item} type="tv" />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.key}
      renderItem={renderSection}
      style={styles.container}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  content: {
    padding: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  seeAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 80,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  horizontalList: {
    gap: 16,
  },
  cardWrapper: {
    width: 160,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  browseButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16,
    minWidth: 140,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
