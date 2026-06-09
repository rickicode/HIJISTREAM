import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import TVFocusable from './TVFocusable';

const CARD_WIDTH = 200;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 1.5;

export default function ContentCard({ item, type }) {
  const router = useRouter();

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
      focusScale={1.1}
      showFocusRing={false}
      style={styles.wrapper}
      accessibilityLabel={item.title}
    >
      {({ isFocused }) => (
        <View style={[
          styles.imageContainer,
          isFocused && styles.imageContainerFocused
        ]}>
          {item.poster_url ? (
            <Image source={{ uri: item.poster_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={styles.placeholderText}>{item.title?.[0] || '?'}</Text>
            </View>
          )}

          {rating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          )}

          {/* Premium Text Overlay Inside Poster */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
            style={styles.textOverlay}
          >
            <Text style={[styles.title, isFocused && styles.titleFocused]} numberOfLines={2}>
              {item.title}
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
    width: CARD_WIDTH,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: CARD_IMAGE_HEIGHT,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  imageContainerFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
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
    fontSize: 36,
    fontWeight: '700',
    color: colors.textMuted,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.rating,
  },
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm + 4,
    justifyContent: 'flex-end',
    zIndex: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  titleFocused: {
    color: colors.primary,
  },
  year: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
  },
});
