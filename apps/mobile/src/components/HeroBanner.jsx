import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Plus } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';
import TVFocusable from './TVFocusable';

export default function HeroBanner({ item, type = 'movie' }) {
  const router = useRouter();

  if (!item) return null;

  const backdropUri = item.backdrop_url || item.poster_url;
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()).slice(0, 3) : [];

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
        <View style={styles.gradientOverlay1} />
        <View style={styles.gradientOverlay2} />
        <View style={styles.gradientOverlay3} />
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
              <Text style={styles.playText}>Play</Text>
            </TVFocusable>
            <TVFocusable onPress={() => {}} style={styles.listButton}>
              <Plus color={colors.text} size={18} />
              <Text style={styles.listText}>My List</Text>
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
    height: 400,
    justifyContent: 'flex-end',
  },
  gradientOverlay1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,20,20,0.1)',
  },
  gradientOverlay2: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
    backgroundColor: 'rgba(20,20,20,0.6)',
  },
  gradientOverlay3: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
    backgroundColor: 'rgba(20,20,20,0.9)',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
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
