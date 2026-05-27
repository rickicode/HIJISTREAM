import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

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
        <PulseBox style={styles.cardSubtitle} />
      </View>
    );
  }

  if (type === 'detail') {
    return (
      <View style={styles.detailContainer}>
        <PulseBox style={styles.detailPoster} />
        <View style={styles.detailInfo}>
          <PulseBox style={styles.detailTitle} />
          <PulseBox style={styles.detailMeta} />
          <PulseBox style={styles.detailGenres} />
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
          <PulseBox style={styles.gridSubtitle} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#262626',
    borderRadius: 8,
  },
  // Card type
  cardContainer: {
    width: 180,
    padding: 8,
  },
  cardPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
  },
  cardTitle: {
    height: 14,
    width: '80%',
    marginTop: 8,
    borderRadius: 4,
  },
  cardSubtitle: {
    height: 12,
    width: '50%',
    marginTop: 6,
    borderRadius: 4,
  },
  // Detail type
  detailContainer: {
    flexDirection: 'row',
    padding: 40,
  },
  detailPoster: {
    width: 250,
    aspectRatio: 2 / 3,
    borderRadius: 12,
  },
  detailInfo: {
    flex: 1,
    marginLeft: 24,
    justifyContent: 'center',
  },
  detailTitle: {
    height: 28,
    width: '60%',
    borderRadius: 6,
  },
  detailMeta: {
    height: 16,
    width: '40%',
    marginTop: 12,
    borderRadius: 4,
  },
  detailGenres: {
    height: 28,
    width: '50%',
    marginTop: 16,
    borderRadius: 14,
  },
  detailOverview: {
    height: 14,
    width: '90%',
    marginTop: 16,
    borderRadius: 4,
  },
  detailOverview2: {
    height: 14,
    width: '75%',
    marginTop: 8,
    borderRadius: 4,
  },
  // Grid type
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 40,
    gap: 16,
  },
  gridItem: {
    width: 180,
  },
  gridPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
  },
  gridTitle: {
    height: 14,
    width: '80%',
    marginTop: 8,
    borderRadius: 4,
  },
  gridSubtitle: {
    height: 12,
    width: '50%',
    marginTop: 6,
    borderRadius: 4,
  },
});
