import { useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { ArrowLeft } from 'lucide-react-native';
import { saveWatchProgress } from '../utils/player';
import TVFocusable from './TVFocusable';

export default function VideoPlayer({ embedUrl, title, contentId, onBack, metadata = {} }) {
  const lastSaveRef = useRef(0);

  const injectedJavaScript = useMemo(
    () => `
      (function() {
        var originalPostMessage = window.postMessage;
        window.postMessage = function(data, origin) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
          }
          originalPostMessage.call(window, data, origin);
        };
      })();
      true;
    `,
    []
  );

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
      <View style={styles.header}>
        <TVFocusable onPress={onBack} style={styles.backButton}>
          <ArrowLeft color="#9CA3AF" size={20} />
        </TVFocusable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <WebView
        source={{ uri: embedUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    gap: 12,
  },
  backButton: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
