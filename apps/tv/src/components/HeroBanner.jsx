import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play, Plus, Info } from 'lucide-react-native';
import { colors, spacing } from '@hijistream/shared/theme';
import TVFocusable from './TVFocusable';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BANNER_HEIGHT = SCREEN_HEIGHT * 0.72;
const AUTO_SLIDE_INTERVAL = 8000;
const PAUSE_DURATION = 12000;

export default function HeroBanner({ items }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const flatListRef = useRef(null);
  const intervalRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const router = useRouter();

  const startAutoSlide = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SLIDE_INTERVAL);
  }, [items.length]);

  const pauseAutoSlide = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
      startAutoSlide();
    }, PAUSE_DURATION);
  }, [startAutoSlide]);

  useEffect(() => {
    if (!isPaused) startAutoSlide();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, [isPaused, startAutoSlide]);

  const handlePlay = (item) => {
    const type = item.type || item.media_type || 'movie';
    router.push({
      pathname: '/player',
      params: { id: item.id, type, title: item.title },
    });
  };

  const handleMoreInfo = (item) => {
    const type = item.type || item.media_type || 'movie';
    router.push(`/${type}/${item.id}`);
  };

  const renderItem = ({ item }) => {
    const backdrop = item.backdrop_url || item.poster_url;
    const genres = item.genres
      ? item.genres.slice(0, 3).map(g => typeof g === 'string' ? g : g.name).join(' | ')
      : '';

    return (
      <View style={styles.slide}>
        {backdrop && (
          <Image source={{ uri: backdrop }} style={styles.backdrop} resizeMode="cover" />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(20,20,20,0.6)', colors.background]}
          style={styles.gradient}
        />
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          {genres ? <Text style={styles.genres}>{genres}</Text> : null}
          {item.overview ? (
            <Text style={styles.overview} numberOfLines={3}>{item.overview}</Text>
          ) : null}
          <View style={styles.buttons}>
            <TVFocusable
              onPress={() => handlePlay(item)}
              onFocus={pauseAutoSlide}
              style={styles.playButton}
              focusScale={1.08}
              accessibilityLabel="Play"
            >
              <Play size={22} color="#000" fill="#000" />
              <Text style={styles.playText}>Play</Text>
            </TVFocusable>
            <TVFocusable
              onPress={() => {}}
              onFocus={pauseAutoSlide}
              style={styles.secondaryButton}
              focusScale={1.08}
              accessibilityLabel="My List"
            >
              <Plus size={22} color={colors.text} />
              <Text style={styles.secondaryText}>My List</Text>
            </TVFocusable>
            <TVFocusable
              onPress={() => handleMoreInfo(item)}
              onFocus={pauseAutoSlide}
              style={styles.secondaryButton}
              focusScale={1.08}
              accessibilityLabel="More Info"
            >
              <Info size={22} color={colors.text} />
              <Text style={styles.secondaryText}>More Info</Text>
            </TVFocusable>
          </View>
        </View>
      </View>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
      <View style={styles.dots}>
        {items.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BANNER_HEIGHT,
    width: SCREEN_WIDTH,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: 'absolute',
    bottom: 60,
    left: spacing.xl,
    maxWidth: '65%',
  },
  title: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  genres: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  overview: {
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 6,
    gap: spacing.sm,
  },
  playText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109,109,110,0.7)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 6,
    gap: spacing.sm,
  },
  secondaryText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  dots: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
});
