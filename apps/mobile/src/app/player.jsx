import { useState, useEffect } from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getMovieEmbedUrl, getTVEmbedUrl, loadWatchProgress } from '../utils/player';
import { colors } from '../theme';
import VideoPlayer from '../components/VideoPlayer';

export default function PlayerScreen() {
  const { type, id, season, episode, title, poster_url, backdrop_url } = useLocalSearchParams();
  const router = useRouter();
  const [embedUrl, setEmbedUrl] = useState(null);

  const contentId =
    type === 'tv' ? `${id}_s${season || '1'}e${episode || '1'}` : id;

  useEffect(() => {
    async function buildUrl() {
      const progress = await loadWatchProgress(contentId);
      const resumeAt = progress?.time || 0;

      if (type === 'movie') {
        setEmbedUrl(getMovieEmbedUrl(id, resumeAt));
      } else {
        setEmbedUrl(getTVEmbedUrl(id, season || '1', episode || '1', resumeAt));
      }
    }
    buildUrl();
  }, [type, id, season, episode, contentId]);

  if (!embedUrl) {
    return <View style={styles.container} />;
  }

  const backgroundUri = backdrop_url || poster_url;

  return (
    <ImageBackground
      source={{ uri: backgroundUri }}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Dark overlay so player is clearly visible against backdrop */}
      <View style={styles.outerOverlay} />
      {/* Player sits in the center, backdrop visible around edges */}
      <View style={styles.playerWrapper}>
        <VideoPlayer
          embedUrl={embedUrl}
          title={title || ''}
          contentId={contentId}
          onBack={() => router.back()}
          metadata={{
            title: title || '',
            poster_url: poster_url || '',
            type: type || 'movie',
          }}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  playerWrapper: {
    flex: 1,
    width: '100%',
    zIndex: 1,
  },
});
