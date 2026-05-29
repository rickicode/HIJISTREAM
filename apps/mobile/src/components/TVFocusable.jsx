import { useState, useRef, useEffect } from 'react';
import { Pressable, Animated, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme';
import useIsTV from '../hooks/useIsTV';

/**
 * Focusable wrapper for Android TV D-pad navigation.
 *
 * Features:
 *  - Animated scale-up on focus (1.06 default, configurable).
 *  - High-contrast border ring + elevation when focused.
 *  - Supports nextFocusDown/Up/Left/Right for explicit focus routing.
 *  - Falls back to no-op on phones (focus events never fire on touch).
 *  - Uses Pressable from react-native-tvos which natively supports
 *    hasTVPreferredFocus and D-pad navigation props.
 */
export default function TVFocusable({
  children,
  onPress,
  style,
  focusStyle,
  hasTVPreferredFocus = false,
  focusScale = 1.06,
  showFocusRing = true,
  disabled = false,
  accessibilityLabel,
  accessibilityRole = 'button',
  nextFocusDown,
  nextFocusUp,
  nextFocusLeft,
  nextFocusRight,
  onFocus,
  onBlur,
}) {
  const isTV = useIsTV();
  const [isFocused, setIsFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isFocused && isTV ? focusScale : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [isFocused, isTV, focusScale, scale]);

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) onBlur();
  };

  const showRing = isTV && showFocusRing && isFocused;

  // Build TV-specific focus routing props
  const tvProps = {};
  if (isTV) {
    tvProps.hasTVPreferredFocus = hasTVPreferredFocus;
    if (nextFocusDown != null) tvProps.nextFocusDown = nextFocusDown;
    if (nextFocusUp != null) tvProps.nextFocusUp = nextFocusUp;
    if (nextFocusLeft != null) tvProps.nextFocusLeft = nextFocusLeft;
    if (nextFocusRight != null) tvProps.nextFocusRight = nextFocusRight;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        showRing && styles.ringWrapper,
        { transform: [{ scale }] },
        showRing && Platform.OS === 'android' ? { elevation: 16 } : null,
      ]}
    >
      <Pressable
        onPress={onPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        focusable={!disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        style={[styles.inner, style, isFocused && focusStyle]}
        {...tvProps}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 6,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  ringWrapper: {
    borderWidth: 3,
    borderColor: colors.primary,
    elevation: 16,
  },
  inner: {
    minWidth: 48,
    minHeight: 48,
  },
});
