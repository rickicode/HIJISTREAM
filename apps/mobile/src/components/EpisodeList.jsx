import { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Play } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import TVFocusable from './TVFocusable';

export default function EpisodeList({ episodes, seasons = 1, tmdbId: _tmdbId, onPlayEpisode }) {
  const totalSeasons = typeof seasons === 'number' ? seasons : 1;
  const [activeSeason, setActiveSeason] = useState(1);

  const hasEpisodeData = Array.isArray(episodes) && episodes.length > 0;
  const seasonEpisodes = hasEpisodeData
    ? episodes.filter(
        (ep) => ep.season === activeSeason || ep.season_number === activeSeason
      )
    : [];

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No episodes available for this season</Text>
      <TVFocusable
        onPress={() => onPlayEpisode(activeSeason, 1)}
        style={styles.playSeasonButton}
      >
        <Play color="#000000" size={16} fill="#000000" />
        <Text style={styles.playSeasonText}>Play Season {activeSeason}</Text>
      </TVFocusable>
    </View>
  );

  const renderEpisode = ({ item: ep, index }) => {
    const epNumber = ep.episode_number || ep.episode || index + 1;
    const epTitle = ep.name || ep.title || `Episode ${epNumber}`;
    const runtime = ep.runtime ? `${ep.runtime}m` : null;
    const overview = ep.overview || null;

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
    <View style={styles.container}>
      <Text style={styles.heading}>Episodes</Text>
      {totalSeasons > 1 && (
        <View style={styles.seasonRow}>
          {Array.from({ length: totalSeasons }).map((_, i) => (
            <TVFocusable
              key={i + 1}
              onPress={() => setActiveSeason(i + 1)}
              style={[
                styles.seasonButton,
                activeSeason === i + 1 && styles.seasonButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.seasonText,
                  activeSeason === i + 1 && styles.seasonTextActive,
                ]}
              >
                Season {i + 1}
              </Text>
            </TVFocusable>
          ))}
        </View>
      )}
      {seasonEpisodes.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={seasonEpisodes}
          keyExtractor={(item, index) =>
            String(item.episode_number || item.episode || index)
          }
          renderItem={renderEpisode}
          scrollEnabled={false}
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
  heading: {
    color: colors.text,
    ...typography.title,
    marginBottom: spacing.md,
  },
  seasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  seasonButtonActive: {
    backgroundColor: colors.primary,
  },
  seasonText: {
    color: colors.textMuted,
    ...typography.body,
    fontWeight: '500',
  },
  seasonTextActive: {
    color: colors.text,
  },
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
