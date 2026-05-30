import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation, SUPPORTED_LOCALES } from '@hijistream/shared/i18n';
import { colors, spacing, typography, borderRadius } from '@hijistream/shared/theme';

export default function LanguageModal({ visible, onClose }) {
  const { locale, setLocale, t } = useTranslation();

  const handleSelect = (code) => {
    setLocale(code);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <View
          style={styles.content}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>
            {t('profile.selectLanguage')}
          </Text>
          {SUPPORTED_LOCALES.map((lang) => {
            const isSelected = locale === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => handleSelect(lang.code)}
                style={styles.item}
                accessibilityLabel={lang.nativeName}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <Text style={styles.langName}>
                  {lang.nativeName}
                </Text>
                {isSelected && (
                  <Check color={colors.primary} size={20} />
                )}
              </Pressable>
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
  content: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  flag: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  langName: {
    color: colors.text,
    ...typography.subtitle,
    flex: 1,
  },
});
