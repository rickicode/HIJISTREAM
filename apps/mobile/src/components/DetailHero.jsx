import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Plus, Check } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '@hijistream/shared/theme';
import { useTranslation } from '@hijistream/shared/i18n';
import TVFocusable from './TVFocusable';
import useMyList from '@hijistream/shared/hooks/useMyList';
import useIsTV from '../hooks/useIsTV';
import { findGenreId } from '@hijistream/shared/utils/genres';

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
        {/* Action Buttons - redesigned */}
        <View style={[styles.actionRow, isTV && styles.actionRowTV]}>
          {onPlay && (
            <TVFocusable
              onPress={onPlay}
              style={isTV ? styles.playBtnTV : styles.playBtn}
              hasTVPreferredFocus={true}
            >
              <View style={isTV ? styles.playIconWrapTV : styles.playIconWrap}>
                <Play color="#000000" size={isTV ? 28 : 18} fill="#000000" />
              </View>
              <Text style={isTV ? styles.playLabelTV : styles.playLabel}>
                {t('common.play')}
              </Text>
            </TVFocusable>
          )}
          <TVFocusable
            onPress={toggleList}
            style={[
              isTV ? styles.myListBtnTV : styles.myListBtn,
              inList && (isTV ? styles.myListBtnActiveTV : styles.myListBtnActive),
            ]}
          >
            {inList ? (
              <Check color={colors.primary} size={isTV ? 26 : 18} strokeWidth={3} />
            ) : (
              <Plus color={colors.text} size={isTV ? 26 : 18} strokeWidth={2.5} />
            )}
            <Text
              style={[
                isTV ? styles.myListLabelTV : styles.myListLabel,
                inList && styles.myListLabelActive,
              ]}
            >
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
  genreRowTV: {
    marginTop: spacing.lg,
    gap: spacing.md,
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

  // --- Action Row ---
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionRowTV: {
    gap: spacing.xl,
    marginTop: spacing.xl,
  },

  // --- Play Button (Mobile) ---
  playBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minHeight: 48,
    elevation: 4,
  },
  playIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playLabel: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // --- Play Button (TV) ---
  playBtnTV: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: borderRadius.lg,
    minHeight: 68,
    minWidth: 220,
    elevation: 6,
  },
  playIconWrapTV: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playLabelTV: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // --- My List Button (Mobile) ---
  myListBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  myListBtnActive: {
    backgroundColor: 'rgba(229,9,20,0.12)',
    borderColor: colors.primary,
  },
  myListLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  myListLabelActive: {
    color: colors.primary,
  },

  // --- My List Button (TV) ---
  myListBtnTV: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: borderRadius.lg,
    minHeight: 68,
    minWidth: 200,
  },
  myListBtnActiveTV: {
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderColor: colors.primary,
  },
  myListLabelTV: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
});
