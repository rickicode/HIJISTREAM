import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors, spacing } from '@hijistream/shared/theme';
import { useMyListItems } from '@hijistream/shared/hooks/useMyList';
import ContentCard from '../../components/ContentCard';

export default function MyListScreen() {
  const { items, loading } = useMyListItems();

  if (!loading && items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Your List is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Add movies and TV shows to your list to watch them later.
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <ContentCard item={item} type={item.type || 'movie'} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My List</Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        numColumns={5}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
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
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptySubtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
