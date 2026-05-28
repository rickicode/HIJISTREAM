import { useState, useEffect } from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getMovieEmbedUrl, getTVEmbedUrl, loadWatchProgress } from '../utils/player';
import { getDsLang } from '../utils/language';
import { colors } from '../theme';
import VideoPlayer from '../components/VideoPlayer';

export default function PlayerScreen() {
  const { type, id, season, episode, title, poster_url, backdrop_url } = useLocalSearchParams();
  const router = useRouter();
  const [embedUrl, setEmbedUrl] = useState(null);
  const [dsLang, setDsLangState] = useState(null);

  const contentId =
    type === 'tv' ? `${id}_s${season || '1'}e${episode || '1'}` : id;

  useEffect(() => {
    getDsLang().then(setDsLangState);
  }, []);

  useEffect(() => {
    async function buildUrl() {
      const progress = await loadWatchProgress(contentId);
      const resumeAt = progress?.time || 0;
      const options = { skin: 'netflix', dsLang: dsLang };

      if (type === 'movie') {
        setEmbedUrl(getMovieEmbedUrl(id, resumeAt, options));
      } else {
        setEmbedUrl(getTVEmbedUrl(id, season || '1', episode || '1', resumeAt, options));
      }
    }
    buildUrl();
  }, [type, id, season, episode, contentId, dsLang]);

  if (!embedUrl) {
    return <View style={styles.container} />;
  }

  return (
    <ImageBackground
      source={{ uri: backdrop_url || poster_url }}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
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
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
});
