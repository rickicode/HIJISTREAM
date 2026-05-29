import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Heart } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useTranslation } from '../i18n';
import TVFocusable from './TVFocusable';
import useMyList from '../hooks/useMyList';
import useIsTV from '../hooks/useIsTV';
import { findGenreId } from '../utils/genres';

export default function DetailHero({ item, type = 'movie', onPlay }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { inList, toggle: toggleList } = useMyList(item, type);
  const isTV = useIsTV();
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()) : [];

  const handleGenrePress = (genreName) => {
    const genreId = findGenreId(genreName, t);
    if (genreId) {
      router.push(`/genre/${genreId}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoSection}>
        <View style={styles.posterRow}>
          <View style={styles.posterContainer}>
            <Image
              source={{ uri: item.poster_url }}
              style={styles.poster}
              resizeMode="cover"
            />
          </View>
          <View style={styles.metaContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.metaRow}>
              {item.year && <Text style={styles.metaText}>{item.year}</Text>}
              {item.rating && (
                <Text style={styles.ratingText}>{item.rating}</Text>
              )}
              {item.runtime && (
                <Text style={styles.metaText}>{item.runtime} min</Text>
              )}
            </View>
          </View>
        </View>
        {genres.length > 0 && (
          <View style={[styles.genreRow, isTV && styles.genreRowTV]}>
            {genres.map((genre) => (
              <TVFocusable
                key={genre}
                onPress={() => handleGenrePress(genre)}
                style={styles.genrePill}
              >
                <Text style={styles.genreText}>{genre}</Text>
              </TVFocusable>
            ))}
          </View>
        )}
        {item.overview && (
          <Text style={styles.overview} numberOfLines={4}>
            {item.overview}
          </Text>
        )}
        <View style={[styles.actionRow, isTV && styles.actionRowTV]}>
          {onPlay && (
            <TVFocusable onPress={onPlay} style={[styles.playButton, isTV && styles.playButtonTV]}>
              <Play color="#000000" size={isTV ? 24 : 20} fill="#000000" />
              <Text style={[styles.playText, isTV && styles.playTextTV]}>{t('common.play')}</Text>
            </TVFocusable>
          )}
          <TVFocusable
            onPress={toggleList}
            style={[styles.listButton, inList && styles.listButtonActive, isTV && styles.listButtonTV]}
          >
            <Heart
              color={inList ? colors.primary : colors.text}
              fill={inList ? colors.primary : 'transparent'}
              size={isTV ? 24 : 20}
              strokeWidth={2.2}
            />
            <Text style={[styles.listText, inList && styles.listTextActive, isTV && styles.listTextTV]}>
              {t('common.myList')}
            </Text>
          </TVFocusable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  infoSection: {
    padding: spacing.md,
  },
  posterRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  posterContainer: {
    width: 150,
    aspectRatio: 2 / 3,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  metaContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    ...typography.hero,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaText: {
    color: colors.textSecondary,
    ...typography.body,
  },
  ratingText: {
    color: colors.rating,
    ...typography.body,
    fontWeight: '600',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  genrePill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreText: {
    color: 'rgba(255,255,255,0.8)',
    ...typography.caption,
  },
  overview: {
    color: colors.textSecondary,
    ...typography.body,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  playButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    minHeight: 52,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  playText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  listButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    minHeight: 52,
  },
  listButtonActive: {
    backgroundColor: 'rgba(229,9,20,0.18)',
    borderColor: colors.primary,
  },
  listText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  listTextActive: {
    color: colors.primary,
  },
  actionRowTV: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  playButtonTV: {
    minHeight: 60,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  listButtonTV: {
    minHeight: 60,
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  playTextTV: {
    fontSize: 20,
  },
  listTextTV: {
    fontSize: 18,
  },
  genreRowTV: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});
