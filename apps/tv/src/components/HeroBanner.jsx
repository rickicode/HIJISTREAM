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
const BANNER_HEIGHT = SCREEN_HEIGHT * 0.78;
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
              focusScale={1.08}
              hasTVPreferredFocus
              accessibilityLabel={`Play ${title}`}
            >
              <Play size={24} color="#000" fill="#000" />
              <Text style={styles.playText}>Play</Text>
            </TVFocusable>

            <TVFocusable
              onPress={() => handleMoreInfo(item)}
              onFocus={pauseAutoSlide}
              onBlur={resumeAutoSlide}
              style={styles.secondaryButton}
              focusStyle={styles.secondaryButtonFocused}
              focusScale={1.08}
              accessibilityLabel={`More info about ${title}`}
            >
              <Info size={24} color="#fff" />
              <Text style={styles.secondaryText}>More Info</Text>
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
    marginBottom: -60,
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
    width: SCREEN_WIDTH * 0.3,
  },
  content: {
    position: 'absolute',
    bottom: 100,
    left: 56,
    maxWidth: '55%',
    zIndex: 10,
  },
  title: {
    fontSize: 52,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 6,
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 17,
    color: '#b3b3b3',
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 15,
    color: colors.rating,
    fontWeight: '700',
  },
  genres: {
    fontSize: 16,
    color: '#b3b3b3',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  overview: {
    fontSize: 17,
    color: '#ccc',
    lineHeight: 26,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 14,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 4,
    gap: 10,
  },
  playButtonFocused: {
    backgroundColor: '#e5e5e5',
  },
  playText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109,109,110,0.7)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 4,
    gap: 10,
  },
  secondaryButtonFocused: {
    backgroundColor: 'rgba(109,109,110,0.9)',
  },
  secondaryText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  dots: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#E50914',
    width: 22,
    borderRadius: 5,
  },
  maturityBadge: {
    position: 'absolute',
    bottom: 36,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderLeftWidth: 3,
    borderLeftColor: '#E50914',
    paddingHorizontal: 12,
    paddingVertical: 4,
    zIndex: 10,
  },
  maturityText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
