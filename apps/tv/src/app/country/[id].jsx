import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '@hijistream/shared/utils/api';
import { colors, spacing } from '@hijistream/shared/theme';
import ContentCard from '../../components/ContentCard';

export default function CountryScreen() {
  const { id } = useLocalSearchParams();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id, page]);

  async function loadData() {
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
  }

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
    padding: spacing.lg,
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
