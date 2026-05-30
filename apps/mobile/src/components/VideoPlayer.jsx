import { useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { saveWatchProgress } from '@hijistream/shared/utils/player';

export default function VideoPlayer({ embedUrl, contentId, onBack, metadata = {} }) {
  const lastSaveRef = useRef(0);
  const webViewRef = useRef(null);

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
});
