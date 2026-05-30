import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import api from '@hijistream/shared/utils/api';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import ContentCard from '../components/ContentCard';

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
      <ContentCard item={item} type={item.media_type || 'movie'} />
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
          placeholderTextColor={colors.textMuted}
          autoFocus
          returnKeyType="search"
        />
      </View>
      {results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={5}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      ) : query.length > 1 && !loading ? (
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
    padding: spacing.lg,
  },
  searchRow: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 20,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
});
