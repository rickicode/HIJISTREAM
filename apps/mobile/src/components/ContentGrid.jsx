import { FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, spacing } from '../theme';
import ContentCard from './ContentCard';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

function getNumColumns(width) {
  if (width < 1280) return 4;
  if (width < 1920) return 5;
  return 6;
}

export default function ContentGrid({
  items,
  type = 'movie',
  isLoading = false,
  error = null,
  onRetry,
  onEndReached,
  ListHeaderComponent,
}) {
  const { width } = useWindowDimensions();
  const numColumns = getNumColumns(width);

  if (isLoading && (!items || items.length === 0)) {
    return <LoadingState type="grid" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  const validItems = (items || []).filter(item => item && (item.id || item.tmdb_id));

  return (
    <FlatList
      data={validItems}
      numColumns={numColumns}
      key={`grid-${numColumns}`}
      keyExtractor={(item) => String(item.tmdb_id)}
      renderItem={({ item }) => (
        <ContentCard item={item} type={type} watchProgress={item.watchProgress} />
      )}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.container}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
});
