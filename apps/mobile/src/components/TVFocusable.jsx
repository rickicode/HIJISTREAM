import { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function TVFocusable({
  children,
  onPress,
  style,
  hasTVPreferredFocus = false,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      hasTVPreferredFocus={hasTVPreferredFocus}
      activeOpacity={0.8}
      style={[
        styles.container,
        isFocused && styles.focused,
        isFocused && { transform: [{ scale: 1.03 }] },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 48,
    minHeight: 48,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  focused: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
});
