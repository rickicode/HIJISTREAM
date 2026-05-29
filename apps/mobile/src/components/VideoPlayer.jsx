import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Text, Modal, ScrollView, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { Play, Pause, SkipBack, SkipForward, Captions, ArrowLeft, Settings, Check } from 'lucide-react-native';
import { saveWatchProgress } from '../utils/player';
import TVFocusable from './TVFocusable';
import useIsTV, { isTV } from '../hooks/useIsTV';
import { colors, spacing, borderRadius } from '../theme';

const TV_CONTROLS_HIDE_DELAY = 6000;

const SUBTITLE_LANGUAGES = [
  { code: '', label: 'Off' },
  { code: 'eng', label: 'English' },
  { code: 'ind', label: 'Indonesian' },
  { code: 'ara', label: 'Arabic' },
  { code: 'chi', label: 'Chinese' },
  { code: 'dut', label: 'Dutch' },
  { code: 'fre', label: 'French' },
  { code: 'ger', label: 'German' },
  { code: 'hin', label: 'Hindi' },
  { code: 'ita', label: 'Italian' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'kor', label: 'Korean' },
  { code: 'may', label: 'Malay' },
  { code: 'por', label: 'Portuguese' },
  { code: 'pob', label: 'Portuguese-BR' },
  { code: 'rus', label: 'Russian' },
  { code: 'spa', label: 'Spanish' },
  { code: 'tha', label: 'Thai' },
  { code: 'tur', label: 'Turkish' },
  { code: 'vie', label: 'Vietnamese' },
];

const PLAYBACK_SPEEDS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x (Normal)' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

/**
 * Build the player URL with an optional ds_lang parameter for subtitles.
 * If langCode is empty or null, ds_lang is removed from the URL.
 */
function buildUrlWithSubtitle(baseUrl, langCode) {
  try {
    const url = new URL(baseUrl);
    if (langCode) {
      url.searchParams.set('ds_lang', langCode);
    } else {
      url.searchParams.delete('ds_lang');
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export default function VideoPlayer({ embedUrl, contentId, onBack, metadata = {} }) {
  const lastSaveRef = useRef(0);
  const webViewRef = useRef(null);
  const hideTimerRef = useRef(null);
  const isTVDevice = useIsTV();
  const [showTVControls, setShowTVControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSubtitleModal, setShowSubtitleModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState('');
  const [selectedSpeed, setSelectedSpeed] = useState(1);
  const [currentUrl, setCurrentUrl] = useState(embedUrl);

  // Update internal URL when embedUrl prop changes
  useEffect(() => {
    setCurrentUrl(embedUrl);
  }, [embedUrl]);

  // Auto-hide timer logic for TV controls
  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    setShowTVControls(true);
    hideTimerRef.current = setTimeout(() => {
      setShowTVControls(false);
    }, TV_CONTROLS_HIDE_DELAY);
  }, []);

  useEffect(() => {
    if (isTVDevice) {
      resetHideTimer();
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isTVDevice, resetHideTimer]);

  // Inject JS into the WebView to control the embedded player
  const injectCommand = useCallback((script) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    resetHideTimer();
    setIsPlaying((prev) => !prev);
    injectCommand(`
      (function() {
        var iframe = document.getElementById('pf');
        if (iframe) {
          iframe.contentWindow.postMessage({type:'PLAYER_COMMAND', action:'togglePlay'}, '*');
        }
        var evt = new KeyboardEvent('keydown', {key: ' ', code: 'Space', keyCode: 32, bubbles: true});
        document.dispatchEvent(evt);
      })(); true;
    `);
  }, [injectCommand, resetHideTimer]);

  const handleSeekBack = useCallback(() => {
    resetHideTimer();
    injectCommand(`
      (function() {
        var evt = new KeyboardEvent('keydown', {key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, bubbles: true});
        document.dispatchEvent(evt);
      })(); true;
    `);
  }, [injectCommand, resetHideTimer]);

  const handleSeekForward = useCallback(() => {
    resetHideTimer();
    injectCommand(`
      (function() {
        var evt = new KeyboardEvent('keydown', {key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true});
        document.dispatchEvent(evt);
      })(); true;
    `);
  }, [injectCommand, resetHideTimer]);

  // Open native subtitle selection modal
  const handleOpenSubtitles = useCallback(() => {
    resetHideTimer();
    setShowSubtitleModal(true);
  }, [resetHideTimer]);

  // Open native settings/speed modal
  const handleOpenSettings = useCallback(() => {
    resetHideTimer();
    setShowSettingsModal(true);
  }, [resetHideTimer]);

  // Handle subtitle language selection - rebuild URL with ds_lang param
  const handleSelectSubtitle = useCallback((langCode) => {
    setSelectedSubtitle(langCode);
    setShowSubtitleModal(false);
    const newUrl = buildUrlWithSubtitle(embedUrl, langCode);
    setCurrentUrl(newUrl);
    resetHideTimer();
  }, [embedUrl, resetHideTimer]);

  // Handle playback speed selection - inject postMessage to inner player
  const handleSelectSpeed = useCallback((speed) => {
    setSelectedSpeed(speed);
    setShowSettingsModal(false);
    injectCommand(`
      (function() {
        var iframe = document.getElementById('pf');
        if (iframe) {
          iframe.contentWindow.postMessage({type:'PLAYER_COMMAND', action:'setSpeed', value: ${speed}}, '*');
        }
        // Also try dispatching on the document for the outer frame
        document.dispatchEvent(new CustomEvent('setPlaybackRate', {detail: ${speed}}));
      })(); true;
    `);
    resetHideTimer();
  }, [injectCommand, resetHideTimer]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    }
  }, [onBack]);

  const handleOverlayFocus = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  const injectedJavaScript = useMemo(
    () => `
      (function() {
        // Block popup ads - override window.open completely
        window.open = function() { return { closed: false }; };

        // Block the popup/ad script that listens on mousedown
        // The ad script uses form-based navigation trick, block form.submit
        HTMLFormElement.prototype.submit = function() {};

        // Block popup via createElement trick
        var origCreate = document.createElement.bind(document);
        document.createElement = function(tag) {
          if (tag === 'a') {
            var el = origCreate(tag);
            el.setAttribute('target', '_self');
            return el;
          }
          // Block ad/tracking scripts
          if (tag === 'script') {
            var el = origCreate(tag);
            var origSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
            if (origSrc && origSrc.set) {
              Object.defineProperty(el, 'src', {
                set: function(v) {
                  if (v && (v.includes('histats.com') || v.includes('s10.histats'))) {
                    return; // block analytics/ad scripts
                  }
                  origSrc.set.call(el, v);
                },
                get: function() { return origSrc.get.call(el); }
              });
            }
            return el;
          }
          return origCreate(tag);
        };

        // Prevent any click/mousedown handlers that try to open new windows
        document.addEventListener('click', function(e) {
          var target = e.target.closest('a[target="_blank"]');
          if (target) {
            e.preventDefault();
            e.stopPropagation();
          }
        }, true);

        // Block mousedown popup triggers (the ad script uses mousedown)
        document.addEventListener('mousedown', function(e) {
          e.stopImmediatePropagation();
        }, true);

        // Forward player events to React Native
        window.addEventListener('message', function(event) {
          if (window.ReactNativeWebView && event.data) {
            try {
              var msg = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
              window.ReactNativeWebView.postMessage(msg);
            } catch(e) {}
          }
        });

        // Remove histats and ad tracking elements
        setTimeout(function() {
          var scripts = document.querySelectorAll('script[src*="histats"], noscript');
          scripts.forEach(function(s) { s.remove(); });
        }, 500);

        ${isTV ? `
        // TV-specific: ensure iframe fills the screen, hide ad overlays
        (function() {
          var iframe = document.getElementById('pf');
          if (!iframe) return;

          // Inject CSS to hide any overlay ads in the outer page
          var style = document.createElement('style');
          style.textContent = [
            'iframe { width: 100% !important; height: 100% !important; }',
            'body > *:not(iframe):not(script):not(style) { display: none !important; }',
          ].join('\\n');
          document.head.appendChild(style);

          // Forward key events to the iframe via postMessage
          document.addEventListener('keydown', function(e) {
            if (iframe && iframe.contentWindow) {
              try {
                iframe.contentWindow.postMessage({
                  type: 'KEY_EVENT',
                  key: e.key,
                  keyCode: e.keyCode,
                  code: e.code
                }, '*');
              } catch(err) {}
            }
          });
        })();
        ` : ''}
      })();
      true;
    `,
    []
  );

  const handleShouldStartLoad = useCallback((request) => {
    const url = request.url || '';
    // Allow the embed player and all domains required for it to function
    if (
      url.startsWith('https://vaplayer.ru') ||
      url.startsWith('https://brightpathsignals.com') ||
      url.startsWith('https://streamdata.vaplayer.ru') ||
      url.startsWith('https://cdn.jsdelivr.net') ||
      url.startsWith('https://code.jquery.com') ||
      url.startsWith('https://cdnjs.cloudflare.com') ||
      url.startsWith('https://www.gstatic.com') ||
      url.startsWith('about:blank') ||
      url === ''
    ) {
      return true;
    }
    // Block all other URLs (ad redirects, popups, analytics, etc.)
    return false;
  }, []);

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'PLAYER_EVENT' && data.data) {
          const { player_status, player_progress, player_duration } = data.data;

          // Sync overlay play/pause state with actual player
          if (player_status === 'playing') {
            setIsPlaying(true);
          } else if (player_status === 'paused') {
            setIsPlaying(false);
          }

          if (player_status === 'playing' || player_status === 'paused') {
            const now = Date.now();
            if (now - lastSaveRef.current >= 5000) {
              lastSaveRef.current = now;
              saveWatchProgress(contentId, player_progress, player_duration, metadata);
            }
          }
        }

        if (data.type === 'PLAYER_EVENT' && data.event === 'progress') {
          const now = Date.now();
          if (now - lastSaveRef.current >= 5000) {
            lastSaveRef.current = now;
            saveWatchProgress(contentId, data.time, data.duration, metadata);
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    [contentId, metadata]
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        allowsFullscreenVideo={true}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
      />

      {/* TV Controls Overlay - only rendered on TV devices */}
      {isTVDevice && (
        <View
          style={[
            styles.tvOverlay,
            { opacity: showTVControls ? 1 : 0 },
          ]}
          pointerEvents={showTVControls ? 'auto' : 'none'}
        >
          {/* Top bar: Back + Title */}
          <View style={styles.tvTopBar}>
            <TVFocusable
              onPress={handleBack}
              onFocus={handleOverlayFocus}
              style={styles.tvButton}
              accessibilityLabel="Back"
            >
              <ArrowLeft color="#FFFFFF" size={28} />
            </TVFocusable>
            <Text style={styles.tvTitle} numberOfLines={1}>
              {metadata.title || ''}
            </Text>
          </View>

          {/* Bottom bar: Player controls */}
          <View style={styles.tvBottomBar}>
            <TVFocusable
              onPress={handleSeekBack}
              onFocus={handleOverlayFocus}
              style={styles.tvButton}
              accessibilityLabel="Seek back 10 seconds"
            >
              <SkipBack color="#FFFFFF" size={28} />
            </TVFocusable>

            <TVFocusable
              onPress={handlePlayPause}
              onFocus={handleOverlayFocus}
              style={styles.tvButtonLarge}
              hasTVPreferredFocus={true}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause color="#FFFFFF" size={36} />
              ) : (
                <Play color="#FFFFFF" size={36} />
              )}
            </TVFocusable>

            <TVFocusable
              onPress={handleSeekForward}
              onFocus={handleOverlayFocus}
              style={styles.tvButton}
              accessibilityLabel="Seek forward 10 seconds"
            >
              <SkipForward color="#FFFFFF" size={28} />
            </TVFocusable>

            <TVFocusable
              onPress={handleOpenSubtitles}
              onFocus={handleOverlayFocus}
              style={styles.tvButton}
              accessibilityLabel="Subtitles"
            >
              <Captions color="#FFFFFF" size={28} />
            </TVFocusable>

            <TVFocusable
              onPress={handleOpenSettings}
              onFocus={handleOverlayFocus}
              style={styles.tvButton}
              accessibilityLabel="Settings"
            >
              <Settings color="#FFFFFF" size={28} />
            </TVFocusable>
          </View>
        </View>
      )}

      {/* Hidden focus trigger to re-show overlay when hidden on TV */}
      {isTVDevice && !showTVControls && (
        <View style={styles.tvFocusTrigger} pointerEvents="auto">
          <TVFocusable
            onFocus={handleOverlayFocus}
            onPress={handleOverlayFocus}
            style={styles.tvFocusTriggerButton}
            hasTVPreferredFocus={false}
            accessibilityLabel="Show player controls"
          >
            <View />
          </TVFocusable>
        </View>
      )}

      {/* Native Subtitle Selection Modal */}
      <Modal
        visible={showSubtitleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSubtitleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Subtitles</Text>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {SUBTITLE_LANGUAGES.map((lang, index) => (
                <TVFocusable
                  key={lang.code || 'off'}
                  onPress={() => handleSelectSubtitle(lang.code)}
                  style={[
                    styles.modalItem,
                    selectedSubtitle === lang.code && styles.modalItemActive,
                  ]}
                  hasTVPreferredFocus={index === 0}
                  accessibilityLabel={lang.label}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedSubtitle === lang.code && styles.modalItemTextActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                  {selectedSubtitle === lang.code && (
                    <Check color={colors.primary} size={20} />
                  )}
                </TVFocusable>
              ))}
            </ScrollView>
            <TVFocusable
              onPress={() => setShowSubtitleModal(false)}
              style={styles.modalCloseButton}
              accessibilityLabel="Close subtitle menu"
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TVFocusable>
          </View>
        </View>
      </Modal>

      {/* Native Settings/Speed Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Playback Speed</Text>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {PLAYBACK_SPEEDS.map((speed, index) => (
                <TVFocusable
                  key={speed.value}
                  onPress={() => handleSelectSpeed(speed.value)}
                  style={[
                    styles.modalItem,
                    selectedSpeed === speed.value && styles.modalItemActive,
                  ]}
                  hasTVPreferredFocus={index === 0}
                  accessibilityLabel={speed.label}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedSpeed === speed.value && styles.modalItemTextActive,
                    ]}
                  >
                    {speed.label}
                  </Text>
                  {selectedSpeed === speed.value && (
                    <Check color={colors.primary} size={20} />
                  )}
                </TVFocusable>
              ))}
            </ScrollView>
            <TVFocusable
              onPress={() => setShowSettingsModal(false)}
              style={styles.modalCloseButton}
              accessibilityLabel="Close settings menu"
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
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  tvOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  tvTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  tvTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginLeft: spacing.md,
    flex: 1,
  },
  tvBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    gap: spacing.lg,
  },
  tvButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tvButtonLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tvFocusTrigger: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  tvFocusTriggerButton: {
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  // Modal styles for subtitle and settings selection
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: 400,
    maxHeight: '80%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalScrollContent: {
    gap: spacing.xs,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalItemActive: {
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalItemText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  modalItemTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  modalCloseButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
