import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { ChevronLeft, Subtitles } from 'lucide-react-native';
import { saveWatchProgress } from '../utils/player';
import useIsTV from '../hooks/useIsTV';
import TVFocusable from './TVFocusable';

export default function VideoPlayer({ embedUrl, contentId, onBack, metadata = {} }) {
  const isTV = useIsTV();
  const lastSaveRef = useRef(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef(null);

  // Auto-hide TV controls after 5 seconds of inactivity
  useEffect(() => {
    if (!isTV) return undefined;
    if (showControls) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isTV, showControls]);

  const injectedJavaScript = useMemo(
    () => `
      (function() {
        // Block popup ads - override window.open
        window.open = function() { return null; };

        // Block popup via createElement trick
        var origCreate = document.createElement.bind(document);
        document.createElement = function(tag) {
          if (tag === 'a') {
            var el = origCreate(tag);
            el.setAttribute('target', '_self');
            return el;
          }
          return origCreate(tag);
        };

        // Prevent any click handlers that try to open new windows
        document.addEventListener('click', function(e) {
          var target = e.target.closest('a[target="_blank"]');
          if (target) {
            e.preventDefault();
            e.stopPropagation();
          }
        }, true);

        // Forward player events to React Native
        var originalPostMessage = window.postMessage;
        window.postMessage = function(data, origin) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
          }
          originalPostMessage.call(window, data, origin);
        };

        window.addEventListener('message', function(event) {
          if (window.ReactNativeWebView && event.data) {
            window.ReactNativeWebView.postMessage(
              typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
            );
          }
        });
      })();
      true;
    `,
    []
  );

  const handleShouldStartLoad = useCallback((request) => {
    const url = request.url || '';
    // Only allow vaplayer.ru URLs and about:blank
    if (url.startsWith('https://vaplayer.ru') || url.startsWith('about:blank') || url === '') {
      return true;
    }
    // Block all other URLs (ad redirects, popups, etc.)
    return false;
  }, []);

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'PLAYER_EVENT' && data.data) {
          const { player_status, player_progress, player_duration } = data.data;

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
      {isTV && showControls && (
        <View style={styles.tvOverlay} pointerEvents="box-none">
          <View style={styles.tvTopBar}>
            <TVFocusable
              onPress={onBack}
              style={styles.tvControlButton}
              hasTVPreferredFocus={false}
              accessibilityLabel="Back"
            >
              <ChevronLeft size={28} color="#FFFFFF" />
            </TVFocusable>
          </View>
          <View style={styles.tvBottomBar}>
            <TVFocusable
              onPress={() => {}}
              style={styles.tvControlButton}
              hasTVPreferredFocus={false}
              accessibilityLabel="Subtitles"
            >
              <Subtitles size={24} color="#FFFFFF" />
            </TVFocusable>
          </View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tvTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingBottom: 12,
  },
  tvBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: 12,
  },
  tvControlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
