import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation, SUPPORTED_LOCALES } from '@hijistream/shared/i18n';
import { colors, spacing, typography, borderRadius } from '@hijistream/shared/theme';
import TVFocusable from './TVFocusable';
import useIsTV from '../hooks/useIsTV';

/**
 * Language picker.
 *
 * On phone: bottom-sheet with tap-outside-to-dismiss + drag handle.
 * On TV: centered card with focusable items so the D-pad can highlight a row
 *        and the Back button on the remote dismisses via onRequestClose.
 *        We intentionally don't use tap-outside-to-dismiss on TV because
 *        there's no concept of "tapping outside" with a remote.
 */
export default function LanguageModal({ visible, onClose }) {
  const { locale, setLocale, t } = useTranslation();
  const isTV = useIsTV();

  const handleSelect = (code) => {
    setLocale(code);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isTV ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, isTV && styles.overlayTV]}
        // Tap-outside is mobile-only; on TV the user dismisses with Back.
        onPress={isTV ? undefined : onClose}
      >
        <View
          style={[styles.content, isTV && styles.contentTV]}
          onStartShouldSetResponder={() => true}
        >
          {!isTV && <View style={styles.handle} />}
          <Text style={[styles.title, isTV && styles.titleTV]}>
            {t('profile.selectLanguage')}
          </Text>
          {SUPPORTED_LOCALES.map((lang, idx) => {
            const isSelected = locale === lang.code;
            return (
              <TVFocusable
                key={lang.code}
                onPress={() => handleSelect(lang.code)}
                hasTVPreferredFocus={isTV && (isSelected || (idx === 0 && !SUPPORTED_LOCALES.some((l) => l.code === locale)))}
                style={[styles.item, isTV && styles.itemTV]}
                accessibilityLabel={lang.nativeName}
              >
                <Text style={[styles.flag, isTV && styles.flagTV]}>{lang.flag}</Text>
                <Text style={[styles.langName, isTV && styles.langNameTV]}>
                  {lang.nativeName}
                </Text>
                {isSelected && (
                  <Check color={colors.primary} size={isTV ? 28 : 20} />
                )}
              </TVFocusable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  overlayTV: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  contentTV: {
    width: 600,
    maxHeight: '85%',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    ...typography.title,
    marginBottom: spacing.md,
  },
  titleTV: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemTV: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  flag: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  flagTV: {
    fontSize: 28,
    marginRight: spacing.lg,
  },
  langName: {
    color: colors.text,
    ...typography.subtitle,
    flex: 1,
  },
  langNameTV: {
    fontSize: 22,
    fontWeight: '600',
  },
});
