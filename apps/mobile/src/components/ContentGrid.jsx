import { FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, spacing } from '../theme';
import ContentCard from './ContentCard';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import useIsTV from '../hooks/useIsTV';

function getNumColumns(width) {
  if (width < 600) return 2;
  if (width < 900) return 3;
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
  ListEmptyComponent,
}) {
  const { width } = useWindowDimensions();
  const numColumns = getNumColumns(width);
  const isTV = useIsTV();

  if (isLoading && (!items || items.length === 0)) {
    return <LoadingState type="grid" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  const validItems = (items || []).filter(item => item && item.id && item.title);

  return (
    <FlatList
      data={validItems}
      numColumns={numColumns}
      key={`grid-${numColumns}`}
      keyExtractor={(item) => String(item.id || item.tmdb_id)}
      renderItem={({ item, index }) => (
        <ContentCard item={item} type={type} watchProgress={item.watchProgress} hasTVPreferredFocus={isTV && index === 0} />
      )}
      columnWrapperStyle={validItems.length > 0 ? styles.row : undefined}
      contentContainerStyle={[styles.container, isTV && styles.containerTV]}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  containerTV: {
    padding: spacing.xxl,
  },
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
});
