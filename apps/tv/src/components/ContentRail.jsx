import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@hijistream/shared/theme';
import TVFocusable from './TVFocusable';
import ContentCard from './ContentCard';

export default function ContentRail({ title, data, type, listId }) {
  const router = useRouter();

  if (!data || data.length === 0) return null;

  const handleSeeAll = () => {
    router.push({ pathname: '/list/[type]', params: { type: listId } });
  };

  const renderItem = ({ item }) => (
    <ContentCard item={item} type={type} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TVFocusable
          onPress={handleSeeAll}
          style={styles.seeAllButton}
          focusScale={1.05}
        >
          <Text style={styles.seeAllText}>See All</Text>
        </TVFocusable>
      </View>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  seeAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  seeAllText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  list: {
    paddingHorizontal: 48,
    paddingVertical: 12,
  },
  separator: {
    width: 12,
  },
});
