import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ImageBackground, StyleSheet, useWindowDimensions, FlatList, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play, Plus, Check, Info, Star } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import { useTranslation } from '@hijistream/shared/i18n';
import useMyList from '@hijistream/shared/hooks/useMyList';
import { findGenreId } from '@hijistream/shared/utils/genres';

function HeroSlide({ item, type, height: backdropHeight }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { inList, toggle: toggleList } = useMyList(item, type);

  const backdropUri = item.backdrop_url || item.poster_url;
  const genres = item.genre
    ? item.genre.split(',').map((g) => g.trim()).filter(Boolean).slice(0, 3)
    : [];
  const showRating = item.rating && item.rating !== '0.0' && item.rating !== '0';
  const itemId = item.id || item.tmdb_id;

  const handlePlay = () => {
    if (type === 'movie') {
      router.push({
        pathname: '/player',
        params: {
          type: 'movie',
          id: item.imdb_id || item.id,
          title: item.title,
          poster_url: item.poster_url || '',
        },
      });
    } else {
      router.push({
        pathname: '/player',
        params: {
          type: 'tv',
          id: item.id,
          season: '1',
          episode: '1',
          title: item.title,
          poster_url: item.poster_url || '',
        },
      });
    }
  };

  const handleInfo = () => {
    router.push(type === 'movie' ? `/movie/${itemId}` : `/tv/${itemId}`);
  };

  const handleGenrePress = (genreName) => {
    const genreId = findGenreId(genreName, t);
    if (genreId) {
      router.push(`/genre/${genreId}`);
    }
  };

  const genreRow =
    genres.length > 0 ? (
      <View style={styles.genreRow}>
        {genres.map((genre, idx) => (
          <View key={genre} style={styles.genreItem}>
            {idx > 0 && <Text style={styles.genreDot}>&#8226;</Text>}
            <Pressable
              onPress={() => handleGenrePress(genre)}
              style={styles.genreTouch}
              accessibilityLabel={genre}
            >
              <Text style={styles.genreText}>{genre}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <ImageBackground
      source={{ uri: backdropUri }}
      style={[styles.backdrop, { height: backdropHeight }]}
      resizeMode="cover"
    >
      {showRating && (
        <View style={styles.ratingBadge}>
          <Star color="#FFD700" size={13} fill="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      )}

      <LinearGradient
        colors={[
          'rgba(20,20,20,0)',
          'rgba(20,20,20,0.10)',
          'rgba(20,20,20,0.55)',
          colors.background,
        ]}
        locations={[0, 0.4, 0.75, 1]}
        style={styles.gradient}
      >
        <View style={styles.contentMobile}>
          <Text style={styles.titleMobile} numberOfLines={2}>
            {item.title}
          </Text>
          {genreRow}
          <View style={styles.buttonRowMobile}>
            <Pressable
              onPress={toggleList}
              style={styles.sideAction}
              accessibilityLabel={t('common.myList')}
            >
              {inList ? (
                <Check color={colors.text} size={26} strokeWidth={2.6} />
              ) : (
                <Plus color={colors.text} size={26} strokeWidth={2.6} />
              )}
              <Text style={styles.sideActionLabel}>{t('common.myList')}</Text>
            </Pressable>

            <Pressable
              onPress={handlePlay}
              style={styles.playPill}
              accessibilityLabel={t('common.play')}
            >
              <Play color="#000000" size={22} fill="#000000" />
              <Text style={styles.playPillText}>{t('common.play')}</Text>
            </Pressable>

            <Pressable
              onPress={handleInfo}
              style={styles.sideAction}
              accessibilityLabel={t('common.moreInfo')}
            >
              <Info color={colors.text} size={26} strokeWidth={2.2} />
              <Text style={styles.sideActionLabel}>{t('common.moreInfo')}</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

export default function HeroBanner({ items = [], item, type = 'movie' }) {
  const heroItems = items.length > 0 ? items : (item ? [item] : []);

  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const autoScrollTimer = useRef(null);
  const isPaused = useRef(false);
  const resumeTimeout = useRef(null);

  const backdropHeight = Math.round(height * 0.56);
  const activeIndexRef = useRef(0);

  // Auto-advance every 8 seconds
  useEffect(() => {
    if (heroItems.length <= 1) return;

    const startTimer = () => {
      autoScrollTimer.current = setInterval(() => {
        if (isPaused.current) return;
        const next = (activeIndexRef.current + 1) % heroItems.length;
        activeIndexRef.current = next;
        setActiveIndex(next);
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
      }, 8000);
    };

    startTimer();
    return () => {
      clearInterval(autoScrollTimer.current);
      if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    };
  }, [heroItems.length]);

  const pauseAutoScroll = useCallback(() => {
    isPaused.current = true;
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    resumeTimeout.current = setTimeout(() => {
      isPaused.current = false;
    }, 12000);
  }, []);

  const onMomentumScrollEnd = useCallback((e) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    activeIndexRef.current = newIndex;
    setActiveIndex(newIndex);
  }, [width]);

  if (heroItems.length === 0) return null;

  const renderSlide = ({ item: slideItem }) => {
    return (
      <View style={{ width }}>
        <HeroSlide
          item={slideItem}
          type={type}
          height={backdropHeight}
        />
      </View>
    );
  };

  const DotIndicators = () => (
    <View style={styles.dotsContainer}>
      {heroItems.map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.dot,
            idx === activeIndex && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={heroItems}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(slideItem) => String(slideItem.id || slideItem.tmdb_id)}
        renderItem={renderSlide}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollBeginDrag={pauseAutoScroll}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        style={{ height: backdropHeight }}
        snapToAlignment="start"
      />
      {heroItems.length > 1 && <DotIndicators />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  backdrop: {
    width: '100%',
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Dot indicators
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 6,
    marginTop: -spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  ratingBadge: {
    position: 'absolute',
    top: 48,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 2,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Mobile (centered billboard)
  contentMobile: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  titleMobile: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    marginBottom: spacing.sm,
  },
  buttonRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  sideAction: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'transparent',
    paddingVertical: spacing.xs,
  },
  sideActionLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  playPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: borderRadius.md,
    minWidth: 150,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  playPillText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Genres
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  genreItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreTouch: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  genreText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600',
  },
  genreDot: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginHorizontal: 7,
  },
});
