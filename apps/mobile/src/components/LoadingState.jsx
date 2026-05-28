import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

function PulseBox({ style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.placeholder, { opacity }, style]} />;
}

export default function LoadingState({ type = 'grid' }) {
  if (type === 'card') {
    return (
      <View style={styles.cardContainer}>
        <PulseBox style={styles.cardPoster} />
        <PulseBox style={styles.cardTitle} />
      </View>
    );
  }

  if (type === 'detail') {
    return (
      <View style={styles.detailContainer}>
        <PulseBox style={styles.detailBackdrop} />
        <View style={styles.detailInfo}>
          <PulseBox style={styles.detailTitle} />
          <PulseBox style={styles.detailMeta} />
          <PulseBox style={styles.detailOverview} />
          <PulseBox style={styles.detailOverview2} />
        </View>
      </View>
    );
  }

  // grid type
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={styles.gridItem}>
          <PulseBox style={styles.gridPoster} />
          <PulseBox style={styles.gridTitle} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
  },
  // Card type
  cardContainer: {
    width: 120,
    paddingHorizontal: spacing.md,
  },
  cardPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: borderRadius.sm,
  },
  cardTitle: {
    height: 12,
    width: '80%',
    marginTop: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  // Detail type
  detailContainer: {
    backgroundColor: colors.background,
  },
  detailBackdrop: {
    width: '100%',
    height: 350,
    borderRadius: 0,
  },
  detailInfo: {
    padding: spacing.md,
  },
  detailTitle: {
    height: 28,
    width: '60%',
    borderRadius: borderRadius.sm,
  },
  detailMeta: {
    height: 16,
    width: '40%',
    marginTop: spacing.md,
    borderRadius: borderRadius.sm,
  },
  detailOverview: {
    height: 14,
    width: '90%',
    marginTop: spacing.md,
    borderRadius: borderRadius.sm,
  },
  detailOverview2: {
    height: 14,
    width: '75%',
    marginTop: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  // Grid type
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.xl,
    gap: spacing.md,
  },
  gridItem: {
    width: 120,
  },
  gridPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: borderRadius.sm,
  },
  gridTitle: {
    height: 12,
    width: '80%',
    marginTop: spacing.xs,
    borderRadius: borderRadius.sm,
  },
});
