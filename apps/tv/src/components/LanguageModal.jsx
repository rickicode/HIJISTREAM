/**
 * LanguageModal - TV remote-friendly language selection modal
 *
 * Features:
 * - List of all supported languages
 * - Checkmark on current selection
 * - TV remote D-pad navigation
 * - Close button
 */

import { View, Text, Modal, FlatList, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@hijistream/shared/theme';
import { useTranslation, SUPPORTED_LOCALES } from '@hijistream/shared/i18n';
import TVFocusable from './TVFocusable';

export default function LanguageModal({ visible, onClose }) {
  const { locale, setLocale } = useTranslation();

  const handleSelect = async (code) => {
    await setLocale(code);
    onClose();
  };

  const renderItem = ({ item }) => {
    const isSelected = item.code === locale;
    return (
      <TVFocusable
        onPress={() => handleSelect(item.code)}
        style={[styles.item, isSelected && styles.itemSelected]}
        focusStyle={styles.itemFocused}
        focusScale={1.03}
        hasTVPreferredFocus={isSelected}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <View style={styles.labelContainer}>
          <Text style={styles.nativeName}>{item.nativeName}</Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        {isSelected && <Check size={24} color="#E50914" />}
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
            focusStyle={styles.closeButtonFocused}
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
    width: 500,
    maxHeight: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    gap: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229,9,20,0.15)',
  },
  itemFocused: {
    borderColor: '#fff',
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
    color: '#fff',
  },
  name: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonFocused: {
    backgroundColor: '#3a3a3a',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
