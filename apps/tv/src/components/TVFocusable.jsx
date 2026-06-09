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
  ringColor = '#E50914',
  ringWidth = 2.5,
  glowColor = '#E50914',
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
  
  // Extract border radius from passed style for dynamic fitting
  const flatStyle = StyleSheet.flatten(style) || {};
  const borderRadius = flatStyle.borderRadius !== undefined ? flatStyle.borderRadius : 8;

  const tvProps = {
    hasTVPreferredFocus,
  };
  if (nextFocusDown != null) tvProps.nextFocusDown = nextFocusDown;
  if (nextFocusUp != null) tvProps.nextFocusUp = nextFocusUp;
  if (nextFocusLeft != null) tvProps.nextFocusLeft = nextFocusLeft;
  if (nextFocusRight != null) tvProps.nextFocusRight = nextFocusRight;

  const renderChildren = () => {
    if (typeof children === 'function') {
      return children({ isFocused });
    }
    return children;
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          borderRadius,
          borderWidth: ringWidth,
          borderColor: showRing ? ringColor : 'transparent',
          transform: [{ scale }],
        },
        showRing ? {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 12,
        } : null,
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
        {renderChildren()}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Basic wrapper to contain the Pressable
  },
  inner: {
    minWidth: 40,
    minHeight: 40,
  },
});

