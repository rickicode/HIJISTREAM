import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import TVFocusable from './TVFocusable';
import useMyList from '../hooks/useMyList';
import useIsTV from '../hooks/useIsTV';

export default function ContentCard({ item, type = 'movie', watchProgress = null, hasTVPreferredFocus = false }) {
  const router = useRouter();
  const isTV = useIsTV();
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
    <TVFocusable
      onPress={handlePress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={styles.card}
      focusScale={isTV ? 1.1 : 1.02}
      accessibilityLabel={item.title}
    >
      <View style={styles.posterContainer}>
        <Image
          source={{ uri: item.poster_url }}
          style={styles.poster}
          resizeMode="cover"
        />
        {/*
          The inline heart button is touch-only — on TV the D-pad cannot focus
          a Pressable nested inside a focused TouchableOpacity, so we hide it
          on TV. Users add to My List from the detail screen instead.
        */}
        {!isTV && (
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
        )}
        {item.rating && item.rating !== '0' && item.rating !== '0.0' && (
          <View style={[styles.ratingBadge, isTV && styles.ratingBadgeTV]}>
            <Text style={[styles.ratingText, isTV && styles.ratingTextTV]}>★ {item.rating}</Text>
          </View>
        )}
        {watchProgress != null && watchProgress > 0 && (
          <View style={[styles.progressBar, isTV && styles.progressBarTV]}>
            <View style={[styles.progressFill, { width: `${watchProgress}%` }]} />
          </View>
        )}
      </View>
      <View style={[styles.info, isTV && styles.infoTV]}>
        <Text style={[styles.title, isTV && styles.titleTV]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.year && (
          <Text style={[styles.year, isTV && styles.yearTV]}>{item.year}</Text>
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
  progressBarTV: {
    height: 5,
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
  ratingBadgeTV: {
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
  },
  ratingTextTV: {
    fontSize: 14,
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
  infoTV: {
    padding: spacing.sm,
  },
  title: {
    color: colors.text,
    ...typography.body,
  },
  titleTV: {
    fontSize: 16,
    fontWeight: '600',
  },
  year: {
    color: colors.textMuted,
    ...typography.small,
    marginTop: 2,
  },
  yearTV: {
    fontSize: 13,
    marginTop: 4,
  },
});
