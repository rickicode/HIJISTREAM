import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Play, Pause, SkipBack, SkipForward, Captions, ArrowLeft } from 'lucide-react-native';
import { saveWatchProgress } from '../utils/player';
import TVFocusable from './TVFocusable';
import useIsTV, { isTV } from '../hooks/useIsTV';
import { colors, spacing } from '../theme';

const TV_CONTROLS_HIDE_DELAY = 6000;

export default function VideoPlayer({ embedUrl, contentId, onBack, metadata = {} }) {
  const lastSaveRef = useRef(0);
  const webViewRef = useRef(null);
  const hideTimerRef = useRef(null);
  const isTVDevice = useIsTV();
  const [showTVControls, setShowTVControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

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
          iframe.focus();
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
        var iframe = document.getElementById('pf');
        if (iframe) {
          iframe.focus();
        }
        var evt = new KeyboardEvent('keydown', {key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, bubbles: true});
        document.dispatchEvent(evt);
      })(); true;
    `);
  }, [injectCommand, resetHideTimer]);

  const handleSeekForward = useCallback(() => {
    resetHideTimer();
    injectCommand(`
      (function() {
        var iframe = document.getElementById('pf');
        if (iframe) {
          iframe.focus();
        }
        var evt = new KeyboardEvent('keydown', {key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true});
        document.dispatchEvent(evt);
      })(); true;
    `);
  }, [injectCommand, resetHideTimer]);

  const handleToggleCC = useCallback(() => {
    resetHideTimer();
    injectCommand(`
      (function() {
        var iframe = document.getElementById('pf');
        if (iframe) {
          iframe.focus();
          // The inner player has a #ccBtn button - simulate click via postMessage
          iframe.contentWindow.postMessage({type:'PLAYER_COMMAND', action:'toggleCC'}, '*');
          // Also try keyboard shortcut 'c' which many players use for CC
          var evt = new KeyboardEvent('keydown', {key: 'c', code: 'KeyC', keyCode: 67, bubbles: true});
          document.dispatchEvent(evt);
          // Try clicking the CC button directly via iframe focus + dispatching click
          iframe.contentWindow.postMessage({type:'UI_ACTION', target:'ccBtn', action:'click'}, '*');
        }
      })(); true;
    `);
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
        // TV-specific: ensure player controls work with remote
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

          // Focus the iframe so it receives keyboard events from the remote
          iframe.focus();

          // Periodically simulate mouse movement on the iframe
          // This keeps the inner player's controls visible
          setInterval(function() {
            try {
              var rect = iframe.getBoundingClientRect();
              var moveEvt = new MouseEvent('mousemove', {
                clientX: rect.width / 2,
                clientY: rect.height - 60,
                bubbles: true,
                cancelable: true
              });
              document.dispatchEvent(moveEvt);
              iframe.dispatchEvent(moveEvt);
            } catch(err) {}
          }, 4000);

          // Re-focus iframe on any interaction
          document.addEventListener('focus', function() {
            setTimeout(function() { if (iframe) iframe.focus(); }, 50);
          }, true);

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

            // Simulate mouse movement on key press to show controls
            try {
              var rect = iframe.getBoundingClientRect();
              var moveEvt = new MouseEvent('mousemove', {
                clientX: rect.width / 2,
                clientY: rect.height - 60,
                bubbles: true
              });
              iframe.dispatchEvent(moveEvt);
            } catch(err) {}
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
    // Allow the embed player domain and its inner player iframe
    if (
      url.startsWith('https://vaplayer.ru') ||
      url.startsWith('https://brightpathsignals.com') ||
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
        source={{ uri: embedUrl }}
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
              onPress={handleToggleCC}
              onFocus={handleOverlayFocus}
              style={styles.tvButton}
              accessibilityLabel="Toggle subtitles"
            >
              <Captions color="#FFFFFF" size={28} />
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
});
