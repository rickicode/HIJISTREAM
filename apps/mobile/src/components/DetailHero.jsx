import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Heart } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useTranslation } from '../i18n';
import TVFocusable from './TVFocusable';
import useMyList from '../hooks/useMyList';
import { findGenreId } from '../utils/genres';

export default function DetailHero({ item, type = 'movie', onPlay }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { inList, toggle: toggleList } = useMyList(item, type);
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
          <View style={styles.genreRow}>
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
        <View style={styles.actionRow}>
          {onPlay && (
            <TVFocusable onPress={onPlay} style={styles.playButton}>
              <Play color="#000000" size={20} fill="#000000" />
              <Text style={styles.playText}>{t('common.play')}</Text>
            </TVFocusable>
          )}
          <TVFocusable
            onPress={toggleList}
            style={[styles.listButton, inList && styles.listButtonActive]}
          >
            <Heart
              color={inList ? colors.primary : colors.text}
              fill={inList ? colors.primary : 'transparent'}
              size={20}
              strokeWidth={2.2}
            />
            <Text style={[styles.listText, inList && styles.listTextActive]}>
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
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 50,
  },
  playText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  listButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 50,
  },
  listButtonActive: {
    backgroundColor: 'rgba(229,9,20,0.12)',
    borderColor: 'rgba(229,9,20,0.5)',
  },
  listText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  listTextActive: {
    color: colors.primary,
  },
});
