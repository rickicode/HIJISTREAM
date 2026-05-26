import { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Play } from 'lucide-react-native';
import TVFocusable from './TVFocusable';

export default function EpisodeList({ episodes, seasons = 1, tmdbId: _tmdbId, onPlayEpisode }) {
  const totalSeasons = typeof seasons === 'number' ? seasons : 1;
  const [activeSeason, setActiveSeason] = useState(1);
  const episodesPerSeason = 10;

  const hasEpisodeData = Array.isArray(episodes) && episodes.length > 0;
  const seasonEpisodes = hasEpisodeData
    ? episodes.filter(
        (ep) => ep.season === activeSeason || ep.season_number === activeSeason
      )
    : Array.from({ length: episodesPerSeason }).map((_, i) => ({
        episode: i + 1,
        title: `Episode ${i + 1}`,
      }));

  const renderEpisode = ({ item: ep, index }) => {
    const epNumber = ep.episode_number || ep.episode || index + 1;
    const epTitle = ep.name || ep.title || `Episode ${epNumber}`;

    return (
      <View style={styles.episodeRow}>
        <View style={styles.episodeInfo}>
          <Text style={styles.episodeNumber}>
            {String(epNumber).padStart(2, '0')}
          </Text>
          <Text style={styles.episodeTitle}>{epTitle}</Text>
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
      <FlatList
        data={seasonEpisodes}
        keyExtractor={(item, index) =>
          String(item.episode_number || item.episode || index)
        }
        renderItem={renderEpisode}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 40,
    paddingTop: 24,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  seasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  seasonButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#262626',
    minWidth: 80,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonButtonActive: {
    backgroundColor: '#2563EB',
  },
  seasonText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  seasonTextActive: {
    color: '#FFFFFF',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  episodeNumber: {
    color: '#9CA3AF',
    fontSize: 13,
    width: 28,
  },
  episodeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
});
