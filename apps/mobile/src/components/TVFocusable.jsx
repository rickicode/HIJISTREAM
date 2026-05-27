import { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';

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
    minWidth: 80,
    minHeight: 80,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: '#2563EB',
  },
});
