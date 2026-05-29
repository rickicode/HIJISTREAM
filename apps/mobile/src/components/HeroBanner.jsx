import { View, Text, ImageBackground, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Plus, Check, Star } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
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
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()).filter(Boolean).slice(0, 3) : [];
  const showRating = item.rating && item.rating !== '0.0';

  // On TV, hero is the visual anchor of the home screen — full-bleed at
  // ~70% of the viewport so it dominates without hiding the rail beneath.
  // On phone, the original 40% strip is preserved.
  const backdropHeight = isTV ? Math.round(height * 0.7) : Math.round(height * 0.4);

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

  const handleGenrePress = (genreName) => {
    const genreId = findGenreId(genreName, t);
    if (genreId) {
      router.push(`/genre/${genreId}`);
    }
  };

  return (
    <View style={[styles.container, isTV && styles.containerTV]}>
      <ImageBackground
        source={{ uri: backdropUri }}
        style={[styles.backdrop, { height: backdropHeight }]}
        resizeMode="cover"
      >
        {showRating && (
          <View style={[styles.ratingBadge, isTV && styles.ratingBadgeTV]}>
            <Star color="#FFD700" size={isTV ? 18 : 14} fill="#FFD700" />
            <Text style={[styles.ratingText, isTV && styles.ratingTextTV]}>{item.rating}</Text>
          </View>
        )}
        <View style={[styles.content, isTV && styles.contentTV]}>
          <Text style={[styles.title, isTV && styles.titleTV]} numberOfLines={2}>
            {item.title}
          </Text>
          {genres.length > 0 && (
            <View style={[styles.genreRow, isTV && styles.genreRowTV]}>
              {genres.map((genre) => (
                <TVFocusable
                  key={genre}
                  onPress={() => handleGenrePress(genre)}
                  style={[styles.genrePill, isTV && styles.genrePillTV]}
                  focusScale={isTV ? 1.08 : 1.02}
                  accessibilityLabel={genre}
                >
                  <Text style={[styles.genreText, isTV && styles.genreTextTV]} numberOfLines={1}>
                    {genre}
                  </Text>
                </TVFocusable>
              ))}
            </View>
          )}
          {isTV && item.overview && (
            <Text style={styles.overviewTV} numberOfLines={3}>
              {item.overview}
            </Text>
          )}
          <View style={[styles.buttonRow, isTV && styles.buttonRowTV]}>
            <TVFocusable
              onPress={handlePlay}
              hasTVPreferredFocus={hasTVPreferredFocus}
              style={[styles.playButton, isTV ? styles.playButtonTV : styles.playButtonMobile]}
              accessibilityLabel={t('common.play')}
            >
              <Play color="#000000" size={isTV ? 24 : 18} fill="#000000" />
              <Text style={[styles.playText, isTV && styles.playTextTV]}>
                {t('common.play')}
              </Text>
            </TVFocusable>
            <TVFocusable
              onPress={toggleList}
              style={[styles.listButton, isTV ? styles.listButtonTV : styles.listButtonMobile]}
              accessibilityLabel={t('common.myList')}
            >
              {inList ? (
                <Check color={colors.text} size={isTV ? 24 : 18} strokeWidth={3} />
              ) : (
                <Plus color={colors.text} size={isTV ? 24 : 18} />
              )}
              <Text style={[styles.listText, isTV && styles.listTextTV]}>
                {t('common.myList')}
              </Text>
            </TVFocusable>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  containerTV: {
    marginBottom: spacing.xl,
  },
  backdrop: {
    justifyContent: 'flex-end',
  },
  ratingBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    fontSize: 13,
    fontWeight: '600',
  },
  ratingTextTV: {
    fontSize: 18,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(10,10,10,0.75)',
  },
  contentTV: {
    paddingHorizontal: spacing.xxl + spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    // Stronger gradient-style overlay for legibility at 10ft.
    backgroundColor: 'rgba(10,10,10,0.55)',
    maxWidth: '70%',
  },
  title: {
    color: colors.text,
    ...typography.hero,
    marginBottom: spacing.sm,
  },
  titleTV: {
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 64,
    marginBottom: spacing.sm,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  genreRowTV: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  genrePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genrePillTV: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  genreText: {
    color: 'rgba(255,255,255,0.9)',
    ...typography.caption,
    fontWeight: '600',
  },
  genreTextTV: {
    fontSize: 16,
  },
  overviewTV: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonRowTV: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
  },
  // Mobile: stretch each button to share the row evenly so they read as a
  // balanced pair edge-to-edge within the content's horizontal padding.
  playButtonMobile: {
    flex: 1,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  playButtonTV: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 180,
    minHeight: 56,
    gap: spacing.sm,
    borderRadius: 6,
  },
  playText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  playTextTV: {
    fontSize: 20,
    fontWeight: '700',
  },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: borderRadius.md,
  },
  listButtonMobile: {
    flex: 1,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  listButtonTV: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 180,
    minHeight: 56,
    gap: spacing.sm,
    borderRadius: 6,
  },
  listText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  listTextTV: {
    fontSize: 20,
    fontWeight: '700',
  },
});
