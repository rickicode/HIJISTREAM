import { useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors } from '@hijistream/shared/theme';
import { getDsLang } from '@hijistream/shared/utils/language';
import { getMovieEmbedUrl, getTVEmbedUrl } from '@hijistream/shared/utils/player';
import VideoPlayer from '../components/VideoPlayer';

export default function PlayerScreen() {
  const { id, type, title, season, episode, resumeAt } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <VideoPlayer
        id={id}
        type={type || 'movie'}
        title={title || ''}
        season={season ? Number(season) : 1}
        episode={episode ? Number(episode) : 1}
        resumeAt={resumeAt ? Number(resumeAt) : 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
