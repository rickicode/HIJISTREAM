import { useState, useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme';
import useIsTV from '../hooks/useIsTV';

/**
 * Focusable wrapper that renders a clearly visible focus state on Android TV.
 *
 * Key differences from a plain TouchableOpacity:
 *  - Animated scale-up on focus (1.06 by default; configurable via `focusScale`).
 *  - Outer glow/border ring drawn OUTSIDE the child via a wrapping Animated.View
 *    so it doesn't shift child layout or get clipped by overflow:hidden cards.
 *  - Elevation lift on focus so the focused item visually rises above peers.
 *  - Falls back to a no-op visual state on phones (focus events never fire on
 *    touch devices anyway), keeping the mobile UI unchanged.
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

  const showRing = isTV && showFocusRing && isFocused;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        showRing && styles.ringWrapper,
        { transform: [{ scale }] },
        showRing && Platform.OS === 'android' ? { elevation: 12 } : null,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        hasTVPreferredFocus={hasTVPreferredFocus}
        activeOpacity={0.85}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        style={[styles.inner, style, isFocused && focusStyle]}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // No padding/margin — the wrapper is invisible by default. Only the focus
    // ring (drawn as a border on this wrapper) appears when focused, which
    // surrounds the child without changing child dimensions.
    borderRadius: 6,
  },
  ringWrapper: {
    // Drawn AROUND the child. Uses a thick high-contrast border + shadow
    // so it's readable from 3 meters away on a 1080p TV.
    borderWidth: 4,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  inner: {
    minWidth: 48,
    minHeight: 48,
  },
});
