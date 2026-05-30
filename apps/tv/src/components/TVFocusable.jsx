import { useState, useRef, useEffect } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { colors } from '@hijistream/shared/theme';

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
  const [isFocused, setIsFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isFocused ? focusScale : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [isFocused, focusScale, scale]);

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) onBlur();
  };

  const showRing = showFocusRing && isFocused;

  const tvProps = {
    hasTVPreferredFocus,
  };
  if (nextFocusDown != null) tvProps.nextFocusDown = nextFocusDown;
  if (nextFocusUp != null) tvProps.nextFocusUp = nextFocusUp;
  if (nextFocusLeft != null) tvProps.nextFocusLeft = nextFocusLeft;
  if (nextFocusRight != null) tvProps.nextFocusRight = nextFocusRight;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        showRing && styles.ringWrapper,
        { transform: [{ scale }] },
        showRing ? { elevation: 16 } : null,
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
