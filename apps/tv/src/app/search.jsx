import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import api from '@hijistream/shared/utils/api';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import ContentCard from '../components/ContentCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 48;
const GRID_GAP = 12;
const COLUMNS = 6;
const CARD_WIDTH = (SCREEN_WIDTH - (2 * GRID_PADDING) - ((COLUMNS - 1) * GRID_GAP)) / COLUMNS;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = useCallback(async (text) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.search(text.trim());
      setResults(data?.items || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <ContentCard item={item} type={item.media_type || 'movie'} width="100%" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleSearch}
          placeholder="Search movies and TV shows..."
          placeholderTextColor="#808080"
          autoFocus
          returnKeyType="search"
        />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>HIJISTREAM</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={6}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      ) : query.length > 1 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No results found for "{query}"</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 48,
    paddingTop: 32, // Extra top space for clean aesthetics
  },
  searchRow: {
    marginBottom: 24,
    width: '100%',
    alignItems: 'center', // Centered search bar
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#333',
    fontFamily: 'Inter_500Medium',
    width: '100%',
    maxWidth: 550, // Premium width for wide TV screen
  },
  grid: {
    paddingBottom: 24,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#808080',
    fontFamily: 'Inter_500Medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 48,
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
