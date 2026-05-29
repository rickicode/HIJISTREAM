import { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { useTranslation } from '../i18n';
import TVFocusable from './TVFocusable';

/**
 * Controlled search input. The parent owns the text value (so it can be set
 * from a tapped recent search / suggestion) and any debouncing. This component
 * is purely presentational + emits onChangeText / onClear.
 */
export default function SearchBar({
  value = '',
  onChangeText,
  onClear,
  placeholder,
  autoFocus = false,
}) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      <Search color={focused ? colors.text : colors.textMuted} size={20} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || t('common.searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        cursorColor={colors.primary}
        selectionColor={colors.primary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value.length > 0 && (
        <TVFocusable onPress={onClear} style={styles.clearButton} accessibilityLabel={t('common.closeSearch')}>
          <X color={colors.text} size={15} strokeWidth={2.6} />
        </TVFocusable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  containerFocused: {
    borderColor: colors.primary,
    backgroundColor: '#202020',
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    height: '100%',
    paddingVertical: 0,
  },
  clearButton: {
    width: 24,
    height: 24,
    minWidth: 24,
    minHeight: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: spacing.xs,
  },
});
