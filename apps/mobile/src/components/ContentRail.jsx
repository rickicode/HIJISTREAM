import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '@hijistream/shared/theme';
import { useTranslation } from '@hijistream/shared/i18n';
import ContentCard from './ContentCard';
import LoadingState from './LoadingState';

export default function ContentRail({
  title,
  items,
  type = 'movie',
  isLoading = false,
  onSeeAll,
}) {
  const { t } = useTranslation();
  const cardWidth = 120;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>
              {t('common.viewAll')} &gt;
            </Text>
          </Pressable>
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
            <View
              key={String(item.id || item.tmdb_id)}
              style={{ width: cardWidth, marginRight: spacing.sm }}
            >
              <ContentCard
                item={item}
                type={item.type || type}
                watchProgress={item.percentage || item.watchProgress}
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
  },
});
