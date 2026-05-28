import { View, Text, Image, ImageBackground, StyleSheet } from 'react-native';
import { Play } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import TVFocusable from './TVFocusable';

export default function DetailHero({ item, type: _type = 'movie', onPlay }) {
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()) : [];
  const backdropUri = item.backdrop_url || item.poster_url;

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
      </ImageBackground>
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
              <View key={genre} style={styles.genrePill}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        )}
        {item.overview && (
          <Text style={styles.overview} numberOfLines={4}>
            {item.overview}
          </Text>
        )}
        {onPlay && (
          <TVFocusable onPress={onPlay} style={styles.playButton}>
            <Play color="#000000" size={20} fill="#000000" />
            <Text style={styles.playText}>Play</Text>
          </TVFocusable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  backdrop: {
    height: 350,
    justifyContent: 'flex-end',
  },
  gradientOverlay1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,20,20,0.2)',
  },
  gradientOverlay2: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
    backgroundColor: 'rgba(20,20,20,0.6)',
  },
  gradientOverlay3: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'rgba(20,20,20,0.9)',
  },
  infoSection: {
    padding: spacing.md,
  },
  posterRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: -60,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    minWidth: 80,
    minHeight: 50,
  },
  playText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
