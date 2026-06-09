/**
 * PlayerScreen - Video player screen for Android TV
 *
 * Wrapper that passes params to VideoPlayer component.
 * VideoPlayer now manages its own back handling (router.back) for clean teardown.
 */

import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import VideoPlayer from '../components/VideoPlayer';

export default function PlayerScreen() {
  const { id, type, title, season, episode, resumeAt, imdbId, tmdbId } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <VideoPlayer
        id={id}
        type={type || 'movie'}
        title={title || ''}
        season={season ? Number(season) : 1}
        episode={episode ? Number(episode) : 1}
        resumeAt={resumeAt ? Number(resumeAt) : 0}
        imdbId={imdbId || undefined}
        tmdbId={tmdbId || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
