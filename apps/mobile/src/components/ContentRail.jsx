import { View, Text, FlatList, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { useTranslation } from '../i18n';
import ContentCard from './ContentCard';
import TVFocusable from './TVFocusable';
import LoadingState from './LoadingState';
import useIsTV from '../hooks/useIsTV';

export default function ContentRail({
  title,
  items,
  type = 'movie',
  isLoading = false,
  onSeeAll,
  hasTVPreferredFocus = false,
}) {
  const { t } = useTranslation();
  const isTV = useIsTV();

  // Cards on TV need to be readable at 3 m: ~200dp wide gives ~300dp tall
  // posters which is the size Netflix/Prime use on Google TV.
  const cardWidth = isTV ? 200 : 120;

  const renderCard = ({ item, index }) => (
    <View style={{ width: cardWidth }}>
      <ContentCard
        item={item}
        type={item.type || type}
        watchProgress={item.percentage || item.watchProgress}
        hasTVPreferredFocus={hasTVPreferredFocus && index === 0}
      />
    </View>
  );

  return (
    <View style={[styles.container, isTV && styles.containerTV]}>
      <View style={[styles.header, isTV && styles.headerTV]}>
        <Text style={[styles.title, isTV && styles.titleTV]}>{title}</Text>
        {onSeeAll && (
          <TVFocusable onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={[styles.seeAllText, isTV && styles.seeAllTextTV]}>
              {t('common.viewAll')} &gt;
            </Text>
          </TVFocusable>
        )}
      </View>
      {isLoading ? (
        <LoadingState type="card" />
      ) : isTV ? (
        // FlatList horizontal supports D-pad left/right focus navigation natively.
        // ScrollView does not propagate focus events to children on Android TV.
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item) => String(item.id || item.tmdb_id)}
          renderItem={renderCard}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentTV}
          ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map((item, idx) => (
            <View
              key={String(item.id || item.tmdb_id)}
              style={{ width: cardWidth, marginRight: spacing.sm }}
            >
              <ContentCard
                item={item}
                type={item.type || type}
                watchProgress={item.percentage || item.watchProgress}
                hasTVPreferredFocus={hasTVPreferredFocus && idx === 0}
              />
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
  containerTV: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  headerTV: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  titleTV: {
    fontSize: 24,
    fontWeight: '700',
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
  seeAllTextTV: {
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  scrollContentTV: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
});
