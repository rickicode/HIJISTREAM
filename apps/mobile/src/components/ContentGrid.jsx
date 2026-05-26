import { FlatList, StyleSheet, Dimensions } from 'react-native';
import ContentCard from './ContentCard';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

function getNumColumns() {
  const { width } = Dimensions.get('window');
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
  const numColumns = getNumColumns();

  if (isLoading && (!items || items.length === 0)) {
    return <LoadingState type="grid" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  return (
    <FlatList
      data={items}
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
    padding: 40,
  },
  row: {
    gap: 16,
    marginBottom: 16,
  },
});
