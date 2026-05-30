import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Modal, FlatList, StyleSheet, Dimensions, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Subtitles, Settings } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import { getMovieEmbedUrl, getTVEmbedUrl, saveWatchProgress } from '@hijistream/shared/utils/player';
import { getDsLang } from '@hijistream/shared/utils/language';
import TVFocusable from './TVFocusable';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OVERLAY_HIDE_TIMEOUT = 6000;

const SUBTITLE_LANGUAGES = [
  { code: '', label: 'Off' },
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ms', label: 'Malay' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'pt-BR', label: 'Portuguese (BR)' },
  { code: 'ru', label: 'Russian' },
  { code: 'es', label: 'Spanish' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'vi', label: 'Vietnamese' },
];

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x (Normal)' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

const ALLOWED_DOMAINS = [
  'vaplayer.ru',
  'brightpathsignals.com',
  'streamdata.vaplayer.ru',
  'cdn.jsdelivr.net',
  'code.jquery.com',
  'cdnjs.cloudflare.com',
  'www.gstatic.com',
];

const INJECTED_JS = `
(function() {
  // Block popups
  window.open = function() { return null; };
  window.alert = function() {};
  window.confirm = function() { return false; };
  window.prompt = function() { return null; };

  // Block form submission (ad redirects)
  HTMLFormElement.prototype.submit = function() {};

  // Block histats and ad scripts
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.tagName === 'SCRIPT' && node.src) {
          if (node.src.indexOf('histats') !== -1 || node.src.indexOf('popunder') !== -1) {
            node.remove();
          }
        }
        if (node.tagName === 'IFRAME' && node.src && node.src.indexOf('histats') !== -1) {
          node.remove();
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Block mousedown propagation on ad triggers
  document.addEventListener('mousedown', function(e) {
    if (e.target.tagName === 'A' && e.target.href && e.target.href.indexOf('vaplayer') === -1) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  // Wait for video iframe and force fullscreen
  function setupIframe() {
    var iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.border = 'none';
      iframe.style.zIndex = '999999';

      // Hide other elements
      var allElements = document.body.children;
      for (var i = 0; i < allElements.length; i++) {
        if (allElements[i] !== iframe && allElements[i].tagName !== 'SCRIPT') {
          allElements[i].style.display = 'none';
        }
      }
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.background = '#000';
    }
  }

  // Forward progress events back to React Native
  function listenForProgress() {
    window.addEventListener('message', function(event) {
      try {
        var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.event === 'timeupdate') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'progress',
            time: data.currentTime,
            duration: data.duration,
          }));
        }
      } catch(e) {}
    });
  }

  // Forward key events to iframe
  document.addEventListener('keydown', function(e) {
    var iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({
        type: 'keydown',
        key: e.key,
        keyCode: e.keyCode,
      }), '*');
    }
  });

  setTimeout(setupIframe, 1000);
  setTimeout(setupIframe, 3000);
  setTimeout(setupIframe, 5000);
  listenForProgress();
})();
true;
`;

export default function VideoPlayer({ id, type, title, season, episode, resumeAt }) {
  const router = useRouter();
  const webViewRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const progressRef = useRef({ time: 0, duration: 0 });

  const [overlayVisible, setOverlayVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [subtitleLang, setSubtitleLang] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [ccModalVisible, setCcModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [hasError, setHasError] = useState(false);

  // Build initial URL
  useEffect(() => {
    buildUrl('');
  }, []);

  const buildUrl = useCallback(async (dsLang, currentTime) => {
    const lang = dsLang || await getDsLang();
    const options = { skin: 'netflix', dsLang: lang || undefined };
    const time = currentTime !== undefined ? currentTime : resumeAt;
    let url;
    if (type === 'tv') {
      url = getTVEmbedUrl(id, season, episode, time, options);
    } else {
      url = getMovieEmbedUrl(id, time, options);
    }
    setEmbedUrl(url);
    setHasError(false);
  }, [id, type, season, episode, resumeAt]);

  // Auto-hide overlay
  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [overlayVisible]);

  const resetHideTimer = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (overlayVisible && !ccModalVisible && !settingsModalVisible) {
      hideTimeoutRef.current = setTimeout(() => {
        setOverlayVisible(false);
      }, OVERLAY_HIDE_TIMEOUT);
    }
  };

  // Save progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const { time, duration } = progressRef.current;
      if (time > 0 && duration > 0) {
        const progressId = type === 'tv' ? `tv_${id}_s${season}e${episode}` : `movie_${id}`;
        saveWatchProgress(progressId, time, duration, { title, type });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [id, type, title, season, episode]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'progress') {
        progressRef.current = { time: data.time, duration: data.duration };
      }
    } catch (e) {}
  };

  const handleShowOverlay = () => {
    if (!overlayVisible) {
      setOverlayVisible(true);
    }
    resetHideTimer();
  };

  const handleBack = () => {
    router.back();
  };

  const injectPlayPause = () => {
    const js = `
      var iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ type: 'keydown', key: ' ', keyCode: 32 }), '*');
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
    setIsPlaying(!isPlaying);
    resetHideTimer();
  };

  const injectSeek = (seconds) => {
    const js = `
      var iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          type: 'keydown',
          key: '${seconds > 0 ? 'ArrowRight' : 'ArrowLeft'}',
          keyCode: ${seconds > 0 ? 39 : 37}
        }), '*');
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
    resetHideTimer();
  };

  const handleSubtitleSelect = (code) => {
    setSubtitleLang(code);
    setCcModalVisible(false);
    // Rebuild URL with new ds_lang, preserving current playback position
    const currentTime = progressRef.current.time || 0;
    buildUrl(code, currentTime > 0 ? currentTime : undefined);
  };

  const handleSpeedSelect = (value) => {
    setPlaybackSpeed(value);
    setSettingsModalVisible(false);
    const js = `
      var iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          type: 'setPlaybackRate',
          rate: ${value}
        }), '*');
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  };

  const onShouldStartLoadWithRequest = (request) => {
    try {
      const url = new URL(request.url);
      const domain = url.hostname;
      return ALLOWED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
    } catch (e) {
      return false;
    }
  };

  const handleWebViewError = () => {
    setHasError(true);
  };

  const handleRetry = () => {
    setHasError(false);
    // Rebuild URL to force WebView to reload
    const currentTime = progressRef.current.time || 0;
    buildUrl(subtitleLang, currentTime > 0 ? currentTime : undefined);
  };

  return (
    <View style={styles.container}>
      {/* WebView Player */}
      {embedUrl && !hasError ? (
        <WebView
          ref={webViewRef}
          source={{ uri: embedUrl }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          injectedJavaScript={INJECTED_JS}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onError={handleWebViewError}
          onHttpError={handleWebViewError}
          allowsFullscreenVideo
        />
      ) : null}

      {/* Error State */}
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load player. Press to retry.</Text>
          <TVFocusable
            onPress={handleRetry}
            style={styles.retryButton}
            focusScale={1.08}
            hasTVPreferredFocus
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TVFocusable>
        </View>
      )}

      {/* Hidden focus trigger - full screen transparent pressable to show overlay */}
      {!overlayVisible && (
        <Pressable
          style={styles.hiddenTrigger}
          onPress={handleShowOverlay}
          onFocus={handleShowOverlay}
          focusable
          hasTVPreferredFocus
        />
      )}

      {/* Native Overlay Controls */}
      {overlayVisible && (
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TVFocusable
              onPress={handleBack}
              onFocus={resetHideTimer}
              style={styles.controlButton}
              focusScale={1.1}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={28} color={colors.text} />
            </TVFocusable>
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <TVFocusable
              onPress={() => injectSeek(-10)}
              onFocus={resetHideTimer}
              style={styles.controlButton}
              focusScale={1.1}
              accessibilityLabel="Seek Back"
            >
              <SkipBack size={28} color={colors.text} />
            </TVFocusable>
            <TVFocusable
              onPress={injectPlayPause}
              onFocus={resetHideTimer}
              style={styles.controlButton}
              focusScale={1.1}
              hasTVPreferredFocus
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={32} color={colors.text} fill={colors.text} />
              ) : (
                <Play size={32} color={colors.text} fill={colors.text} />
              )}
            </TVFocusable>
            <TVFocusable
              onPress={() => injectSeek(10)}
              onFocus={resetHideTimer}
              style={styles.controlButton}
              focusScale={1.1}
              accessibilityLabel="Seek Forward"
            >
              <SkipForward size={28} color={colors.text} />
            </TVFocusable>
            <View style={styles.spacer} />
            <TVFocusable
              onPress={() => { setCcModalVisible(true); resetHideTimer(); }}
              onFocus={resetHideTimer}
              style={styles.controlButton}
              focusScale={1.1}
              accessibilityLabel="Subtitles"
            >
              <Subtitles size={28} color={subtitleLang ? colors.primary : colors.text} />
            </TVFocusable>
            <TVFocusable
              onPress={() => { setSettingsModalVisible(true); resetHideTimer(); }}
              onFocus={resetHideTimer}
              style={styles.controlButton}
              focusScale={1.1}
              accessibilityLabel="Settings"
            >
              <Settings size={28} color={colors.text} />
            </TVFocusable>
          </View>
        </View>
      )}

      {/* Subtitle Modal */}
      <Modal visible={ccModalVisible} transparent animationType="fade" onRequestClose={() => setCcModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <Text style={styles.modalTitle}>Subtitles</Text>
            <FlatList
              data={SUBTITLE_LANGUAGES}
              renderItem={({ item }) => {
                const isSelected = item.code === subtitleLang;
                return (
                  <TVFocusable
                    onPress={() => handleSubtitleSelect(item.code)}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    focusScale={1.03}
                    hasTVPreferredFocus={isSelected}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <View style={styles.checkmark} />}
                  </TVFocusable>
                );
              }}
              keyExtractor={(item) => item.code || 'off'}
              contentContainerStyle={styles.modalList}
            />
            <TVFocusable
              onPress={() => setCcModalVisible(false)}
              style={styles.modalCloseButton}
              focusScale={1.05}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TVFocusable>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={settingsModalVisible} transparent animationType="fade" onRequestClose={() => setSettingsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <Text style={styles.modalTitle}>Playback Speed</Text>
            <FlatList
              data={SPEED_OPTIONS}
              renderItem={({ item }) => {
                const isSelected = item.value === playbackSpeed;
                return (
                  <TVFocusable
                    onPress={() => handleSpeedSelect(item.value)}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    focusScale={1.03}
                    hasTVPreferredFocus={isSelected}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <View style={styles.checkmark} />}
                  </TVFocusable>
                );
              }}
              keyExtractor={(item) => String(item.value)}
              contentContainerStyle={styles.modalList}
            />
            <TVFocusable
              onPress={() => setSettingsModalVisible(false)}
              style={styles.modalCloseButton}
              focusScale={1.05}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TVFocusable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  hiddenTrigger: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: spacing.md,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: spacing.md,
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  spacer: {
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDialog: {
    width: 420,
    maxHeight: '80%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalList: {
    gap: spacing.sm,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
  },
  modalItemSelected: {
    backgroundColor: 'rgba(229,9,20,0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalItemText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '500',
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkmark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  modalCloseButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    fontSize: 22,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
});
