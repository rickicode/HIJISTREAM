import { View, Text, ImageBackground, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Plus, Star } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';
import { useTranslation } from '../i18n';
import TVFocusable from './TVFocusable';

const BACKDROP_HEIGHT = Dimensions.get('window').height * 0.40;

export default function HeroBanner({ item, type = 'movie' }) {
  const router = useRouter();
  const { t } = useTranslation();

  if (!item) return null;

  const backdropUri = item.backdrop_url || item.poster_url;
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()).slice(0, 3) : [];
  const showRating = item.rating && item.rating !== '0.0';

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

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: backdropUri }}
        style={styles.backdrop}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        {showRating && (
          <View style={styles.ratingBadge}>
            <Star color="#FFD700" size={14} fill="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          {genres.length > 0 && (
            <Text style={styles.genres} numberOfLines={1}>
              {genres.join(' \u2022 ')}
            </Text>
          )}
          <View style={styles.buttonRow}>
            <TVFocusable onPress={handlePlay} style={styles.playButton}>
              <Play color="#000000" size={18} fill="#000000" />
              <Text style={styles.playText}>{t('common.play')}</Text>
            </TVFocusable>
            <TVFocusable onPress={() => {}} style={styles.listButton}>
              <Plus color={colors.text} size={18} />
              <Text style={styles.listText}>{t('common.myList')}</Text>
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
  backdrop: {
    height: BACKDROP_HEIGHT,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(10,10,10,0.75)',
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
  ratingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    ...typography.hero,
    marginBottom: spacing.xs,
  },
  genres: {
    color: colors.textSecondary,
    ...typography.caption,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.xs,
    minWidth: 100,
    minHeight: 40,
  },
  playText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.xs,
    minWidth: 100,
    minHeight: 40,
  },
  listText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
