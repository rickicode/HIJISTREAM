import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getMovieEmbedUrl, getTVEmbedUrl, loadWatchProgress } from '../utils/player';
import { useTranslation } from '../i18n';
import VideoPlayer from '../components/VideoPlayer';
import { isTV as isTVStatic } from '../hooks/useIsTV';

export default function PlayerScreen() {
  const { type, id, season, episode, title, poster_url } = useLocalSearchParams();
  const router = useRouter();
  // Read locale synchronously from the LanguageProvider — it gates rendering
  // on isReady, so locale is guaranteed to be loaded by the time we get here.
  // This eliminates the race that previously built the embed URL with a null
  // ds_lang on first paint, then rebuilt it (forcing an iframe reload) once
  // the async getDsLang() resolved. The new flow guarantees the iframe is
  // mounted exactly once with the user's subtitle language set, so the
  // player's OpenSubtitles auto-search fires reliably with the right locale.
  const { locale } = useTranslation();
  const [embedUrl, setEmbedUrl] = useState(null);

  const contentId =
    type === 'tv' ? `${id}_s${season || '1'}e${episode || '1'}` : id;

  // Lock to landscape fullscreen on mount, restore on unmount.
  // Skip on Android TV — TV is permanently landscape and the orientation
  // module logs a "not supported on this device" warning when invoked there.
  useEffect(() => {
    if (isTVStatic) return undefined;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function buildUrl() {
      const progress = await loadWatchProgress(contentId);
      if (!alive) return;
      const resumeAt = progress?.time || 0;
      // Always pass ds_lang (including for English) so the embed player has
      // an explicit subtitle / OpenSubtitles language preference to filter on.
      const options = { skin: 'netflix', dsLang: locale };

      if (type === 'movie') {
        setEmbedUrl(getMovieEmbedUrl(id, resumeAt, options));
      } else {
        setEmbedUrl(getTVEmbedUrl(id, season || '1', episode || '1', resumeAt, options));
      }
    }
    buildUrl();
    return () => {
      alive = false;
    };
  }, [type, id, season, episode, contentId, locale]);

  if (!embedUrl) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
