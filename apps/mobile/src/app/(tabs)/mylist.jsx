import { View, Text, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTranslation } from '../../i18n';
import { colors, spacing, typography } from '../../theme';
import { useMyListItems } from '../../hooks/useMyList';
import ContentGrid from '../../components/ContentGrid';

export default function MyListScreen() {
  const { t } = useTranslation();
  const { items, loading } = useMyListItems();

  if (!loading && items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Heart color={colors.textMuted} size={64} />
        <Text style={styles.title}>{t('nav.myList')}</Text>
        <Text style={styles.subtitle}>{t('myList.emptyState')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ContentGrid items={items} isLoading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    ...typography.title,
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.body,
    textAlign: 'center',
  },
});
