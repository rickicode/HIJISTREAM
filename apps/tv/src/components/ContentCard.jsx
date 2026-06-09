import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import TVFocusable from './TVFocusable';

export default function ContentCard({ item, type, width }) {
  const router = useRouter();
  const cardWidth = width || 140;

  const handlePress = () => {
    const mediaType = item.type || item.media_type || type || 'movie';
    router.push(`/${mediaType}/${item.id}`);
  };

  const rating = item.vote_average
    ? (Math.round(item.vote_average * 10) / 10).toFixed(1)
    : null;

  const year = item.release_date
    ? item.release_date.split('-')[0]
    : item.first_air_date
      ? item.first_air_date.split('-')[0]
      : null;

  return (
    <TVFocusable
      onPress={handlePress}
      focusScale={1.08}
      showFocusRing={false}
      style={[styles.wrapper, { width: cardWidth }]}
      accessibilityLabel={item.title || item.name}
    >
      {({ isFocused }) => (
        <View style={[
          styles.imageContainer,
          { width: '100%', aspectRatio: 2 / 3 },
          isFocused && styles.imageContainerFocused
        ]}>
          {item.poster_url ? (
            <Image source={{ uri: item.poster_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={styles.placeholderText}>{(item.title || item.name)?.[0] || '?'}</Text>
            </View>
          )}

          {rating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          )}

          {/* Premium Text Overlay Inside Poster */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
            style={styles.textOverlay}
          >
            <Text style={[styles.title, isFocused && styles.titleFocused]} numberOfLines={2}>
              {item.title || item.name}
            </Text>
            {year && <Text style={styles.year}>{year}</Text>}
          </LinearGradient>

          {item.progress != null && item.progress > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
            </View>
          )}
        </View>
      )}
    </TVFocusable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.md,
  },
  imageContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  imageContainerFocused: {
    borderColor: '#E50914',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  placeholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textMuted,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
    zIndex: 10,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.rating,
  },
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs + 2,
    justifyContent: 'flex-end',
    zIndex: 5,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  titleFocused: {
    color: '#E50914',
  },
  year: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
  },
  progressFill: {
    height: 3,
    backgroundColor: '#E50914',
  },
});
