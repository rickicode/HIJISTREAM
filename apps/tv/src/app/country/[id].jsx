/**
 * CountryScreen - Country browse results for Android TV
 *
 * Features:
 * - Paginated grid of content by country
 * - TV remote D-pad navigation
 * - Load more on scroll
 * - Back button support
 */

import { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '@hijistream/shared/utils/api';
import { colors } from '@hijistream/shared/theme';
import ContentCard from '../../components/ContentCard';

export default function CountryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    loadData();
  }, [id, page]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getDiscoverByCountry('movie', id, page);
      if (page === 1) {
        setItems(data?.items || []);
      } else {
        setItems(prev => [...prev, ...(data?.items || [])]);
      }
    } catch (err) {
      console.error('Failed to load country:', err);
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <ContentCard item={item} type="movie" />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        numColumns={5}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        onEndReached={() => setPage(p => p + 1)}
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
