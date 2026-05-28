import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import TVFocusable from './TVFocusable';
import useMyList from '../hooks/useMyList';

export default function ContentCard({ item, type = 'movie', watchProgress = null }) {
  const router = useRouter();
  const effectiveType = item?._detectedType || item?.type || type;
  const { inList, toggle } = useMyList(item, effectiveType);

  const handlePress = () => {
    const itemId = item.id || item.tmdb_id;
    if (effectiveType === 'movie') {
      router.push(`/movie/${itemId}`);
    } else {
      router.push(`/tv/${itemId}`);
    }
  };

  const handleHeartPress = (e) => {
    if (e?.stopPropagation) e.stopPropagation();
    toggle();
  };

  return (
    <TVFocusable onPress={handlePress} style={styles.card}>
      <View style={styles.posterContainer}>
        <Image
          source={{ uri: item.poster_url }}
          style={styles.poster}
          resizeMode="cover"
        />
        <Pressable
          onPress={handleHeartPress}
          hitSlop={6}
          style={({ pressed }) => [
            styles.heartButton,
            pressed && styles.heartButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="My List"
        >
          <Heart
            color={inList ? colors.primary : '#FFFFFF'}
            fill={inList ? colors.primary : 'transparent'}
            size={16}
            strokeWidth={2.4}
          />
        </Pressable>
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
  heartButton: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  heartButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    transform: [{ scale: 0.92 }],
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
