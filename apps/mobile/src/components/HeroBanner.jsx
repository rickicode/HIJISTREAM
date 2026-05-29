import { View, Text, ImageBackground, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play, Plus, Check, Info, Star } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { useTranslation } from '../i18n';
import TVFocusable from './TVFocusable';
import useMyList from '../hooks/useMyList';
import useIsTV from '../hooks/useIsTV';
import { findGenreId } from '../utils/genres';

export default function HeroBanner({ item, type = 'movie', hasTVPreferredFocus = true }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { inList, toggle: toggleList } = useMyList(item, type);
  const isTV = useIsTV();
  const { height } = useWindowDimensions();

  if (!item) return null;

  const backdropUri = item.backdrop_url || item.poster_url;
  const genres = item.genre
    ? item.genre.split(',').map((g) => g.trim()).filter(Boolean).slice(0, 3)
    : [];
  const showRating = item.rating && item.rating !== '0.0' && item.rating !== '0';

  // Cinematic full-bleed billboard. The gradient fades to the page background
  // so the hero melts into the rails below (Netflix-style) instead of ending
  // at a hard-edged panel.
  const backdropHeight = isTV ? Math.round(height * 0.72) : Math.round(height * 0.56);

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

  // Bullet-separated, tappable genres (Netflix metadata row) — replaces the
  // old bordered pills which looked clunky.
  const genreRow =
    genres.length > 0 ? (
      <View style={[styles.genreRow, isTV ? styles.genreRowTV : styles.genreRowMobile]}>
        {genres.map((genre, idx) => (
          <View key={genre} style={styles.genreItem}>
            {idx > 0 && <Text style={[styles.genreDot, isTV && styles.genreDotTV]}>•</Text>}
            <TVFocusable
              onPress={() => handleGenrePress(genre)}
              style={styles.genreTouch}
              focusScale={isTV ? 1.06 : 1.0}
              showFocusRing={isTV}
              accessibilityLabel={genre}
            >
              <Text style={[styles.genreText, isTV && styles.genreTextTV]}>{genre}</Text>
            </TVFocusable>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: backdropUri }}
        style={[styles.backdrop, { height: backdropHeight }]}
        resizeMode="cover"
      >
        {showRating && (
          <View style={[styles.ratingBadge, isTV && styles.ratingBadgeTV]}>
            <Star color="#FFD700" size={isTV ? 18 : 13} fill="#FFD700" />
            <Text style={[styles.ratingText, isTV && styles.ratingTextTV]}>{item.rating}</Text>
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
          {isTV ? (
            <View style={styles.contentTV}>
              <Text style={styles.titleTV} numberOfLines={2}>
                {item.title}
              </Text>
              {genreRow}
              {item.overview ? (
                <Text style={styles.overviewTV} numberOfLines={3}>
                  {item.overview}
                </Text>
              ) : null}
              <View style={styles.buttonRowTV}>
                <TVFocusable
                  onPress={handlePlay}
                  hasTVPreferredFocus={hasTVPreferredFocus}
                  style={styles.playButtonTV}
                  accessibilityLabel={t('common.play')}
                >
                  <Play color="#000000" size={24} fill="#000000" />
                  <Text style={styles.playTextTV}>{t('common.play')}</Text>
                </TVFocusable>
                <TVFocusable
                  onPress={toggleList}
                  style={styles.secondaryButtonTV}
                  accessibilityLabel={t('common.myList')}
                >
                  {inList ? (
                    <Check color={colors.text} size={24} strokeWidth={3} />
                  ) : (
                    <Plus color={colors.text} size={24} />
                  )}
                  <Text style={styles.secondaryTextTV}>{t('common.myList')}</Text>
                </TVFocusable>
                <TVFocusable
                  onPress={handleInfo}
                  style={styles.secondaryButtonTV}
                  accessibilityLabel={t('common.moreInfo')}
                >
                  <Info color={colors.text} size={24} />
                  <Text style={styles.secondaryTextTV}>{t('common.moreInfo')}</Text>
                </TVFocusable>
              </View>
            </View>
          ) : (
            <View style={styles.contentMobile}>
              <Text style={styles.titleMobile} numberOfLines={2}>
                {item.title}
              </Text>
              {genreRow}
              {/* Netflix billboard trio: My List · Play · More Info */}
              <View style={styles.buttonRowMobile}>
                <TVFocusable
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
                </TVFocusable>

                <TVFocusable
                  onPress={handlePlay}
                  hasTVPreferredFocus={hasTVPreferredFocus}
                  style={styles.playPill}
                  accessibilityLabel={t('common.play')}
                >
                  <Play color="#000000" size={22} fill="#000000" />
                  <Text style={styles.playPillText}>{t('common.play')}</Text>
                </TVFocusable>

                <TVFocusable
                  onPress={handleInfo}
                  style={styles.sideAction}
                  accessibilityLabel={t('common.moreInfo')}
                >
                  <Info color={colors.text} size={26} strokeWidth={2.2} />
                  <Text style={styles.sideActionLabel}>{t('common.moreInfo')}</Text>
                </TVFocusable>
              </View>
            </View>
          )}
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // The gradient already resolves to the page background at its bottom edge,
    // so no extra margin is needed — the first rail blends straight in.
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
  ratingBadgeTV: {
    top: 32,
    right: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ratingTextTV: {
    fontSize: 18,
  },

  // ---- Mobile (centered billboard) ----
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

  // ---- TV (left-aligned billboard) ----
  contentTV: {
    paddingHorizontal: spacing.xxl + spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: '65%',
  },
  titleTV: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 64,
    marginBottom: spacing.md,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  overviewTV: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  buttonRowTV: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  playButtonTV: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 180,
    minHeight: 56,
    borderRadius: 6,
  },
  playTextTV: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '700',
  },
  secondaryButtonTV: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    borderRadius: 6,
  },
  secondaryTextTV: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },

  // ---- Genres (shared) ----
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  genreRowMobile: {
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  genreRowTV: {
    justifyContent: 'flex-start',
    marginBottom: spacing.lg,
  },
  genreItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreTouch: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 0,
    minHeight: 0,
  },
  genreText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600',
  },
  genreTextTV: {
    fontSize: 17,
  },
  genreDot: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginHorizontal: 7,
  },
  genreDotTV: {
    fontSize: 17,
    marginHorizontal: 10,
  },
});
