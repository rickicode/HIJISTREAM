import { View, Text, Modal, FlatList, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import { useTranslation, SUPPORTED_LOCALES } from '@hijistream/shared/i18n';
import TVFocusable from './TVFocusable';

export default function LanguageModal({ visible, onClose }) {
  const { locale, setLocale } = useTranslation();

  const handleSelect = async (code) => {
    await setLocale(code);
    onClose();
  };

  const renderItem = ({ item, index }) => {
    const isSelected = item.code === locale;
    return (
      <TVFocusable
        onPress={() => handleSelect(item.code)}
        style={[styles.item, isSelected && styles.itemSelected]}
        focusScale={1.03}
        hasTVPreferredFocus={isSelected}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <View style={styles.labelContainer}>
          <Text style={styles.nativeName}>{item.nativeName}</Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        {isSelected && <Check size={24} color={colors.primary} />}
      </TVFocusable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Select Language</Text>
          <FlatList
            data={SUPPORTED_LOCALES}
            renderItem={renderItem}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.list}
          />
          <TVFocusable
            onPress={onClose}
            style={styles.closeButton}
            focusScale={1.05}
          >
            <Text style={styles.closeText}>Close</Text>
          </TVFocusable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: 480,
    maxHeight: '80%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    gap: spacing.md,
  },
  itemSelected: {
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  flag: {
    fontSize: 28,
  },
  labelContainer: {
    flex: 1,
  },
  nativeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  name: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  closeButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
});
