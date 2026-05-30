import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '@hijistream/shared/theme';
import { useTranslation } from '@hijistream/shared/i18n';

export default function ErrorState({ error, onRetry }) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <AlertCircle color={colors.textMuted} size={48} />
      <Text style={styles.heading}>{t('common.error')}</Text>
      <Text style={styles.message}>
        {error?.message || t('common.error')}
      </Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>{t('common.retry')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  heading: {
    color: colors.text,
    ...typography.title,
    marginTop: spacing.md,
  },
  message: {
    color: colors.textMuted,
    ...typography.body,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: 120,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.text,
    ...typography.subtitle,
  },
});
