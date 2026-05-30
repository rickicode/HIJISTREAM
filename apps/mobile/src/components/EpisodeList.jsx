import { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Play, Clock } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '@hijistream/shared/theme';
import TVFocusable from './TVFocusable';
import { useTranslation } from '@hijistream/shared/i18n';
import useIsTV from '../hooks/useIsTV';

export default function EpisodeList({ episodes, seasons = 1, tmdbId: _tmdbId, onPlayEpisode, onSeasonChange }) {
  const { t } = useTranslation();
  const isTV = useIsTV();
  const totalSeasons = typeof seasons === 'number' ? seasons : 1;
  const [activeSeason, setActiveSeason] = useState(1);

  const hasEpisodeData = Array.isArray(episodes) && episodes.length > 0;

  const handleSeasonChange = (season) => {
    setActiveSeason(season);
    if (onSeasonChange) onSeasonChange(season);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{t('player.noEpisodes')}</Text>
      <TVFocusable
        onPress={() => onPlayEpisode(activeSeason, 1)}
        style={styles.playSeasonButton}
      >
        <Play color="#000000" size={16} fill="#000000" />
        <Text style={styles.playSeasonText}>{t('player.playSeason')} {activeSeason}</Text>
      </TVFocusable>
    </View>
  );

  const renderEpisode = ({ item: ep, index }) => {
    const epNumber = ep.episode_number || ep.episode || index + 1;
    const epTitle = ep.name || ep.title || `Episode ${epNumber}`;
    const runtime = ep.runtime ? `${ep.runtime}m` : null;
    const overview = ep.overview || null;

    if (isTV) {
      return (
        <TVFocusable
          onPress={() => onPlayEpisode(activeSeason, epNumber)}
          style={styles.episodeCardTV}
          accessibilityLabel={`${epTitle} - Episode ${epNumber}`}
        >
          <View style={styles.episodeCardLeftTV}>
            <View style={styles.episodeNumberBadgeTV}>
              <Text style={styles.episodeNumberTextTV}>
                {String(epNumber).padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.episodeContentTV}>
              <Text style={styles.episodeTitleTV} numberOfLines={1}>
                {epTitle}
              </Text>
              {overview && (
                <Text style={styles.episodeOverviewTV} numberOfLines={2}>
                  {overview}
                </Text>
              )}
              {runtime && (
                <View style={styles.episodeMetaRowTV}>
                  <Clock color={colors.textMuted} size={14} />
                  <Text style={styles.episodeRuntimeTV}>{runtime}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.episodePlayIndicatorTV}>
            <Play color="#FFFFFF" size={22} fill="#FFFFFF" />
          </View>
        </TVFocusable>
      );
    }

    return (
      <View style={styles.episodeRow}>
        <View style={styles.episodeInfo}>
          <Text style={styles.episodeNumber}>
            {String(epNumber).padStart(2, '0')}
          </Text>
          <View style={styles.episodeDetails}>
            <View style={styles.episodeTitleRow}>
              <Text style={styles.episodeTitle} numberOfLines={1}>{epTitle}</Text>
              {runtime && <Text style={styles.episodeRuntime}>{runtime}</Text>}
            </View>
            {overview && (
              <Text style={styles.episodeOverview} numberOfLines={2}>{overview}</Text>
            )}
          </View>
        </View>
        <TVFocusable
          onPress={() => onPlayEpisode(activeSeason, epNumber)}
          style={styles.playButton}
        >
          <Play color="#FFFFFF" size={14} fill="#FFFFFF" />
        </TVFocusable>
      </View>
    );
  };

  return (
    <View style={[styles.container, isTV && styles.containerTV]}>
      <Text style={[styles.heading, isTV && styles.headingTV]}>
        {t('player.episodes')}
      </Text>
      {totalSeasons > 1 && (
        <View style={[styles.seasonRow, isTV && styles.seasonRowTV]}>
          {Array.from({ length: totalSeasons }).map((_, i) => (
            <TVFocusable
              key={i + 1}
              onPress={() => handleSeasonChange(i + 1)}
              style={[
                styles.seasonButton,
                isTV && styles.seasonButtonTV,
                activeSeason === i + 1 && styles.seasonButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.seasonText,
                  isTV && styles.seasonTextTV,
                  activeSeason === i + 1 && styles.seasonTextActive,
                ]}
              >
                {t('player.season')} {i + 1}
              </Text>
            </TVFocusable>
          ))}
        </View>
      )}
      {!hasEpisodeData ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={episodes}
          keyExtractor={(item, index) =>
            String(item.episode_number || item.episode || index)
          }
          renderItem={renderEpisode}
          scrollEnabled={false}
          contentContainerStyle={isTV ? styles.episodeListTV : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  containerTV: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  heading: {
    color: colors.text,
    ...typography.title,
    marginBottom: spacing.md,
  },
  headingTV: {
    fontSize: 26,
    marginBottom: spacing.lg,
  },
  seasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  seasonRowTV: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  seasonButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    minWidth: 80,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonButtonTV: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minWidth: 120,
    minHeight: 52,
    borderRadius: borderRadius.lg,
  },
  seasonButtonActive: {
    backgroundColor: colors.primary,
  },
  seasonText: {
    color: colors.textMuted,
    ...typography.body,
    fontWeight: '500',
  },
  seasonTextTV: {
    fontSize: 18,
    fontWeight: '600',
  },
  seasonTextActive: {
    color: colors.text,
  },

  // --- Episode List TV ---
  episodeListTV: {
    gap: spacing.sm,
  },
  episodeCardTV: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    minHeight: 88,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  episodeCardLeftTV: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  episodeNumberBadgeTV: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeNumberTextTV: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  episodeContentTV: {
    flex: 1,
    gap: spacing.xs,
  },
  episodeTitleTV: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  episodeOverviewTV: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  episodeMetaRowTV: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  episodeRuntimeTV: {
    color: colors.textMuted,
    fontSize: 13,
  },
  episodePlayIndicatorTV: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(229,9,20,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.lg,
  },

  // --- Mobile Episode Row ---
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  episodeNumber: {
    color: colors.textMuted,
    ...typography.body,
    width: 28,
  },
  episodeDetails: {
    flex: 1,
  },
  episodeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  episodeTitle: {
    color: colors.text,
    ...typography.body,
    flex: 1,
  },
  episodeRuntime: {
    color: colors.textMuted,
    ...typography.small,
  },
  episodeOverview: {
    color: colors.textMuted,
    ...typography.small,
    marginTop: spacing.xs,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    ...typography.body,
    textAlign: 'center',
  },
  playSeasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    minWidth: 140,
    minHeight: 48,
  },
  playSeasonText: {
    color: '#000000',
    ...typography.subtitle,
    fontWeight: '600',
  },
});
