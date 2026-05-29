import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '../../i18n';
import { colors, spacing } from '../../theme';
import { useMyListItems } from '../../hooks/useMyList';
import ContentGrid from '../../components/ContentGrid';

export default function MyListScreen() {
  const { t } = useTranslation();
  const { items, loading } = useMyListItems();

  // Compact empty state — no large icon/title block. Keeps the screen
  // visually consistent with the other list/grid views (genre, browse,
  // /list/[type]) which simply render a grid.
  const emptyState =
    !loading && items.length === 0 ? (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{t('myList.emptyState')}</Text>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <ContentGrid
        items={items}
        isLoading={loading}
        ListEmptyComponent={emptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
