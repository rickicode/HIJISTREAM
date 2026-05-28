import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../theme';
import TVFocusable from './TVFocusable';

export default function ContentCard({ item, type = 'movie', watchProgress = null }) {
  const router = useRouter();

  const handlePress = () => {
    const effectiveType = item._detectedType || item.type || type;
    const itemId = item.id || item.tmdb_id;
    if (effectiveType === 'movie') {
      router.push(`/movie/${itemId}`);
    } else {
      router.push(`/tv/${itemId}`);
    }
  };

  return (
    <TVFocusable onPress={handlePress} style={styles.card}>
      <View style={styles.posterContainer}>
        <Image
          source={{ uri: item.poster_url }}
          style={styles.poster}
          resizeMode="cover"
        />
        {item.rating && item.rating !== '0' && item.rating !== '0.0' && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {item.rating}</Text>
          </View>
        )}
        {watchProgress != null && watchProgress > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${watchProgress}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.year && (
          <Text style={styles.year}>{item.year}</Text>
        )}
      </View>
    </TVFocusable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.card,
    minWidth: 80,
    minHeight: 80,
  },
  posterContainer: {
    aspectRatio: 2 / 3,
    backgroundColor: colors.backgroundElevated,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
  },
  info: {
    padding: spacing.xs,
  },
  title: {
    color: colors.text,
    ...typography.body,
  },
  year: {
    color: colors.textMuted,
    ...typography.small,
    marginTop: 2,
  },
});
