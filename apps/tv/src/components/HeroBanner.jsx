/**
 * HeroBanner - Netflix-style hero banner for Android TV
 *
 * Features:
 * - Full-bleed backdrop with gradient overlay
 * - Auto-rotating carousel (pauses on remote focus)
 * - Title, meta (year, rating, duration), genres, overview
 * - Play and More Info buttons with TV focus
 * - Dot indicators for slide position
 * - Proper TV remote focus management
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play, Info, Star } from 'lucide-react-native';
import { colors } from '@hijistream/shared/theme';
import TVFocusable from './TVFocusable';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BANNER_HEIGHT = SCREEN_HEIGHT * 0.60;
const AUTO_SLIDE_INTERVAL = 10000;

export default function HeroBanner({ items }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const flatListRef = useRef(null);
  const intervalRef = useRef(null);
  const router = useRouter();

  const startAutoSlide = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!items || items.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SLIDE_INTERVAL);
  }, [items]);

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoSlide]);

  const pauseAutoSlide = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resumeAutoSlide = useCallback(() => {
    setIsPaused(false);
    startAutoSlide();
  }, [startAutoSlide]);

  const handlePlay = useCallback((item) => {
    const mediaType = item.type || item.media_type || 'movie';
    router.push(`/${mediaType}/${item.id || item.tmdb_id}`);
  }, [router]);

  const handleMoreInfo = useCallback((item) => {
    const mediaType = item.type || item.media_type || 'movie';
    router.push(`/${mediaType}/${item.id || item.tmdb_id}`);
  }, [router]);

  const renderItem = useCallback(({ item }) => {
    const backdrop = item.backdrop_url || item.poster_url || (item.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
      : null);
    const rating = item.vote_average
      ? (Math.round(item.vote_average * 10) / 10).toFixed(1)
      : item.rating;
    const year = item.release_date
      ? item.release_date.split('-')[0]
      : item.first_air_date
        ? item.first_air_date.split('-')[0]
        : item.year;
    const title = item.title || item.name || 'Untitled';
    const genres = item.genres
      ? item.genres.slice(0, 3).map(g => typeof g === 'string' ? g : g.name).join(' • ')
      : '';

    return (
      <View style={styles.slide}>
        {/* Background */}
        {backdrop && (
          <Image source={{ uri: backdrop }} style={styles.backdrop} resizeMode="cover" />
        )}
        {/* Bottom gradient for text readability */}
        <LinearGradient
          colors={['transparent', 'rgba(20,20,20,0.5)', colors.background]}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        />
        {/* Left gradient for depth */}
        <LinearGradient
          colors={['rgba(20,20,20,0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.15, y: 0 }}
          style={styles.leftGradient}
        />

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>

          <View style={styles.metaRow}>
            {year && <Text style={styles.metaText}>{year}</Text>}
            {rating && (
              <View style={styles.ratingBadge}>
                <Star size={16} color={colors.rating} fill={colors.rating} />
                <Text style={styles.ratingText}>{rating}/10</Text>
              </View>
            )}
            {item.runtime && (
              <Text style={styles.metaText}>{Math.floor(item.runtime / 60)}h {item.runtime % 60}m</Text>
            )}
          </View>

          {genres ? <Text style={styles.genres}>{genres}</Text> : null}

          {item.overview ? (
            <Text style={styles.overview} numberOfLines={3}>{item.overview}</Text>
          ) : null}

          <View style={styles.buttons}>
            <TVFocusable
              onPress={() => handlePlay(item)}
              onFocus={pauseAutoSlide}
              onBlur={resumeAutoSlide}
              style={styles.playButton}
              focusStyle={styles.playButtonFocused}
              focusScale={1.05}
              showFocusRing={false}
              hasTVPreferredFocus
              accessibilityLabel={`Play ${title}`}
            >
              {({ isFocused }) => (
                <>
                  <Play size={16} color={isFocused ? '#fff' : '#000'} fill={isFocused ? '#fff' : '#000'} />
                  <Text style={[styles.playText, { color: isFocused ? '#fff' : '#000' }]}>Play</Text>
                </>
              )}
            </TVFocusable>

            <TVFocusable
              onPress={() => handleMoreInfo(item)}
              onFocus={pauseAutoSlide}
              onBlur={resumeAutoSlide}
              style={styles.secondaryButton}
              focusStyle={styles.secondaryButtonFocused}
              focusScale={1.05}
              showFocusRing={false}
              accessibilityLabel={`More info about ${title}`}
            >
              {({ isFocused }) => (
                <>
                  <Info size={16} color={isFocused ? '#000' : '#fff'} />
                  <Text style={[styles.secondaryText, { color: isFocused ? '#000' : '#fff' }]}>More Info</Text>
                </>
              )}
            </TVFocusable>
          </View>
        </View>
      </View>
    );
  }, [handlePlay, handleMoreInfo, pauseAutoSlide, resumeAutoSlide]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id || item.tmdb_id || Math.random())}
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
        removeClippedSubviews={false}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {items.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Maturity rating */}
      <View style={styles.maturityBadge}>
        <Text style={styles.maturityText}>16+</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BANNER_HEIGHT,
    width: SCREEN_WIDTH,
    marginBottom: -48,
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
  leftGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.35,
  },
  content: {
    position: 'absolute',
    bottom: 48,
    left: 48,
    maxWidth: '50%',
    zIndex: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#b3b3b3',
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 13,
    color: colors.rating,
    fontWeight: '700',
  },
  genres: {
    fontSize: 13,
    color: '#b3b3b3',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  overview: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  playButtonFocused: {
    backgroundColor: '#E50914',
  },
  playText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  secondaryButtonFocused: {
    backgroundColor: '#fff',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  dots: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#E50914',
    width: 16,
    borderRadius: 3,
  },
  maturityBadge: {
    position: 'absolute',
    bottom: 20,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderLeftWidth: 3,
    borderLeftColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 3,
    zIndex: 10,
  },
  maturityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
