import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import ContentCard from './ContentCard';
import TVFocusable from './TVFocusable';
import LoadingState from './LoadingState';

export default function ContentRail({ title, items, type = 'movie', isLoading = false, onSeeAll }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <TVFocusable onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All &gt;</Text>
          </TVFocusable>
        )}
      </View>
      {isLoading ? (
        <LoadingState type="card" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map((item) => (
            <View key={String(item.id || item.tmdb_id)} style={styles.cardWrapper}>
              <ContentCard item={item} type={item.type || type} watchProgress={item.percentage || item.watchProgress} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  seeAllButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 80,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllText: {
    color: colors.textMuted,
    ...typography.body,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  cardWrapper: {
    width: 120,
  },
});
