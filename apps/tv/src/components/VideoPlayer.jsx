/**
 * VideoPlayer — TV-only custom player.
 *
 * Arsitektur:
 *   - WebView load embed URL vaplayer.ru dengan `controls=false&overlay=false` →
 *     UI bawaan TIDAK tampil, hanya video + iframe.
 *   - Custom overlay UI (CustomPlayerOverlay) render di ATAS WebView sebagai
 *     React Native layer, dengan kontrol play/pause/seek/quality/subtitle.
 *   - State player (isPlaying, currentTime, duration, qualities) disinkronkan
 *     via `postMessage` PLAYER_EVENT dari iframe → onMessage WebView.
 *   - Commands (play/pause/seek) dikirim ke iframe via `injectJavaScript`
 *     yang memanipulasi `<video>` element langsung.
 *
 * Subtitle:
 *   - Mount: panggil api.getSubtitles() untuk dapat list {url, lang, cached}.
 *   - Jika ada url (R2-cached): pakai sub_url + sub_lang + sub_default=1.
 *   - Jika tidak ada: pakai ds_lang saja (auto-search OpenSubtitles dari vaplayer).
 *   - User bahasa (currentLanguage) selalu dipilih.
 *   - User bisa ganti subtitle dari overlay picker → reload iframe dengan sub_url baru.
 *
 *   params: { id, type, title, season, episode, resumeAt, imdbId? }
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTVEventHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { getMovieEmbedUrl, getTVEmbedUrl, saveWatchProgress } from '@hijistream/shared/utils/player';
import { getCurrentLanguage } from '@hijistream/shared/utils/language';
import api from '@hijistream/shared/utils/api';
import ADBLOCK_INJECTED_JS from '@hijistream/shared/utils/adblock';
import CustomPlayerOverlay from './CustomPlayerOverlay';

const ISO_639_2_MAP = {
  id: 'ind', en: 'eng', es: 'spa', pt: 'por',
  hi: 'hin', ja: 'jpn', ko: 'kor',
};

// Bridge: forward window.postMessage dari iframe ke ReactNativeWebView,
// dan kirim progress setiap 2 detik selama playing.
const BRIDGE_JS = `
(function(){
  if (window.__tvBridge) return;
  window.__tvBridge = true;
  window.addEventListener('message', function(e){
    if(!window.ReactNativeWebView) return;
    try {
      var msg = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
      window.ReactNativeWebView.postMessage(msg);
    } catch(x){}
  });
  setInterval(function(){
    var v = document.querySelector('video');
    if (v && !v.paused && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'progress',
        time: v.currentTime || 0,
        duration: v.duration || 0,
      }));
    }
  }, 2000);
})();`;

// Inject overlay auto-hide hooks: paksa klik pada video untuk trigger native overlay show
const OVERLAY_HOOK_JS = `
(function(){
  document.addEventListener('mousemove', function(){
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'overlay-show'}));
    }
  }, true);
  // Block default click-to-play supaya native overlay play/pause saja yg control
  document.addEventListener('click', function(e){
    var v = e.target.closest('video');
    if (v && window.ReactNativeWebView) {
      // Allow default click (it'll play/pause video), just notify native
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'video-tap'}));
    }
  }, true);
})();`;

/**
 * Build embed URL dengan parameter subtitle:
 * - sub_url ada (dari R2): gunakan sub_url + sub_lang + sub_default=1
 * - sub_url tidak ada: gunakan ds_lang (auto-search dari vaplayer)
 */
function buildEmbedUrl(base, lang) {
  const params = ['controls=0', 'overlay=0', 'autoplay=1'];
  params.push(`ds_lang=${encodeURIComponent(lang)}`);
  params.push(`lang=${encodeURIComponent(lang)}`);
  params.push(`sub_lang=${encodeURIComponent(lang)}`);
  return `${base}?${params.join('&')}`;
}

function buildEmbedUrlWithSub(base, lang, subUrl) {
  const params = ['controls=0', 'overlay=0', 'autoplay=1'];
  if (subUrl) {
    params.push(`sub_url=${encodeURIComponent(subUrl)}`);
    params.push(`sub_lang=${encodeURIComponent(lang)}`);
    params.push('sub_default=1');
  } else {
    params.push(`ds_lang=${encodeURIComponent(lang)}`);
    params.push(`lang=${encodeURIComponent(lang)}`);
  }
  return `${base}?${params.join('&')}`;
}

export default function VideoPlayer({ id, type, title, season, episode, resumeAt, imdbId: imdbIdProp, tmdbId: tmdbIdProp }) {
  const webViewRef = useRef(null);
  const router = useRouter();

  // Player state (driven by PLAYER_EVENT + progress polling)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Subtitle state
  const [subtitles, setSubtitles] = useState([]);           // [{url, lang, cached}]
  const [selectedSub, setSelectedSub] = useState(null);     // {url, lang} | null
  const [appLanguage, setAppLanguage] = useState('id');
  const [baseEmbedUrl, setBaseEmbedUrl] = useState('');      // base tanpa sub params
  const selectedSubLang = selectedSub?.lang || 'off';

  // D-pad wake: increment counter → overlay listen & show
  const [showTrigger, setShowTrigger] = useState(0);

  // ── Init: build base embed URL, fetch user language, fetch subtitles ──
  useEffect(() => {
    if (!id || !type) return;
    (async () => {
      try {
        const lang = await getCurrentLanguage();
        setAppLanguage(lang);

        // Build base embed URL (tanpa sub params, hanya controls=0 overlay=0 autoplay=1 ds_lang)
        const opts = { skin: 'netflix' };
        const time = resumeAt || 0;
        const base = type === 'tv'
          ? getTVEmbedUrl(id, season, episode, time, opts)
          : getMovieEmbedUrl(id, time, opts);
        setBaseEmbedUrl(base);

        // Set initial embed URL (with ds_lang fallback) — langsung putar
        setEmbedUrl(buildEmbedUrl(base, lang));

        // Fetch subtitles dari R2 (background — tidak block player)
        api.getSubtitles({
          type,
          tmdbId: tmdbIdProp || id,  // Untuk TV: tmdbId. Untuk movie: kalau caller kirim tmdbId, pakai itu; kalau tidak, fallback ke id (yang mungkin IMDB)
          lang,
          season: type === 'tv' ? season : undefined,
          episode: type === 'tv' ? episode : undefined,
          imdbId: imdbIdProp,
        }).then((data) => {
          const list = data?.subtitles || [];
          if (list.length > 0) {
            setSubtitles(list);
            // Auto-select bahasa user
            const match = list.find((s) => s.lang === lang) || list[0];
            setSelectedSub(match);
            // Rebuild embed URL dengan sub_url
            setEmbedUrl(buildEmbedUrlWithSub(base, match.lang, match.url));
          } else {
            // Tidak ada subtitle, tetap pakai ds_lang (sudah di-set di initial)
            setSubtitles([]);
          }
        }).catch(() => {
          setSubtitles([]);
        });
      } catch (err) {
        setErrorMessage(err.message);
        setHasError(true);
      }
    })();
  }, [id, type, season, episode, resumeAt, imdbIdProp, tmdbIdProp]);

  // ── Save watch progress every 5s ──
  useEffect(() => {
    if (!id) return;
    const iv = setInterval(() => {
      if (currentTime > 0 && duration > 0) {
        const pid = type === 'tv' ? `tv_${id}_s${season}e${episode}` : `movie_${id}`;
        saveWatchProgress(pid, currentTime, duration, { title, type });
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [id, type, title, season, episode, currentTime, duration]);

  // ── Handle hardware back → exit player ──
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => handler.remove();
  }, [router]);

  // ── D-pad handler: wake overlay ──
  useTVEventHandler((evt) => {
    if (!evt?.eventType || evt.eventKeyAction === 1) return; // ignore key-up
    const t = evt.eventType;
    if (t === 'right' || t === 'down' || t === 'left' || t === 'up' || t === 'select' || t === 'playPause') {
      console.warn('[Player] D-pad:', t, '→ showTrigger++');
      setShowTrigger(n => n + 1);
    }
  });

  // ── Iframe commands: play/pause/seek via injectJavaScript ──
  const sendCommand = useCallback((cmd) => {
    const js = `(function(){
      var v = document.querySelector('video');
      if (!v) return;
      ${cmd}
    })();`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const handlePlayPause = useCallback(() => {
    sendCommand(`if (v.paused) { v.play().catch(function(){}); } else { v.pause(); }`);
  }, [sendCommand]);

  const handleSeek = useCallback((sec) => {
    sendCommand(`v.currentTime = ${Number(sec) || 0}; v.play().catch(function(){});`);
  }, [sendCommand]);

  const handleQualityChange = useCallback((q) => {
    setCurrentQuality(q);
    // VidAPI tidak expose command API publik untuk ganti quality.
    // Workaround: reload iframe dengan hint via postMessage ke window.__player (jika ada).
    // Untuk sekarang, ini hanya update UI state.
    // User akan melihat quality berubah saat level dipicu (auto ABR).
  }, []);

  const handleSubtitleChange = useCallback((newLang) => {
    if (!newLang) {
      // Off
      setSelectedSub(null);
      // Reload embed URL tanpa sub_url (fallback ke ds_lang)
      if (baseEmbedUrl) setEmbedUrl(buildEmbedUrl(baseEmbedUrl, appLanguage));
    } else {
      const sub = subtitles.find((s) => s.lang === newLang);
      if (sub && baseEmbedUrl) {
        setSelectedSub(sub);
        setEmbedUrl(buildEmbedUrlWithSub(baseEmbedUrl, sub.lang, sub.url));
      }
    }
  }, [baseEmbedUrl, appLanguage, subtitles]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setErrorMessage(null);
    setRetryKey((k) => k + 1);
  }, []);

  // ── onMessage: handle PLAYER_EVENT + progress polling ──
  const onMessage = useCallback((event) => {
    let raw = event.nativeEvent.data;
    let data;
    try {
      data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return;
    }
    if (!data) return;

    if (data.type === 'PLAYER_EVENT' && data.data) {
      const { player_status, player_progress, player_duration, availableQualities, quality } = data.data;
      if (player_status === 'playing') {
        setIsPlaying(true);
        setBuffering(false);
      } else if (player_status === 'paused') {
        setIsPlaying(false);
        setBuffering(false);
      } else if (player_status === 'buffering') {
        setBuffering(true);
      } else if (player_status === 'completed') {
        setIsPlaying(false);
        setBuffering(false);
      }
      if (typeof player_progress === 'number') setCurrentTime(player_progress);
      if (typeof player_duration === 'number' && player_duration > 0) setDuration(player_duration);
      if (Array.isArray(availableQualities) && availableQualities.length > 0) {
        setAvailableQualities(availableQualities);
      }
      if (quality?.label) setCurrentQuality(quality.label);
    } else if (data.type === 'progress') {
      if (typeof data.time === 'number') setCurrentTime(data.time);
      if (typeof data.duration === 'number' && data.duration > 0) setDuration(data.duration);
    } else if (data.type === 'video-tap' || data.type === 'overlay-show') {
      setShowTrigger(n => n + 1);
    }
  }, []);

  const onLoad = useCallback(() => {
    setBuffering(false);
    setHasError(false);
  }, []);

  const onError = useCallback((e) => {
    setHasError(true);
    setErrorMessage(e?.nativeEvent?.description || 'WebView error');
  }, []);

  // ── Render ──
  const finalInjected = useMemo(
    () => `${ADBLOCK_INJECTED_JS}\n${BRIDGE_JS}\n${OVERLAY_HOOK_JS}`,
    []
  );

  return (
    <View style={styles.container} focusable={true} hasTVPreferredFocus={true}>
      {embedUrl && !hasError && (
        <WebView
          key={retryKey}
          ref={webViewRef}
          source={{ uri: embedUrl }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          injectedJavaScript={finalInjected}
          onMessage={onMessage}
          onLoad={onLoad}
          onError={onError}
          allowsFullscreenVideo
          mixedContentMode="compatibility"
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          onShouldStartLoadWithRequest={() => true}
        />
      )}

      <CustomPlayerOverlay
        title={title}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        availableQualities={availableQualities}
        currentQuality={currentQuality}
        subtitles={subtitles}
        selectedSubLang={selectedSubLang}
        buffering={buffering}
        errorMessage={errorMessage}
        showTrigger={showTrigger}
        onBack={() => router.back()}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onQualityChange={handleQualityChange}
        onSubtitleChange={handleSubtitleChange}
        onRetry={handleRetry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
});
