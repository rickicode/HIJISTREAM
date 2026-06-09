/**
 * CustomPlayerOverlay — TV-friendly custom player UI layered over hidden WebView.
 *
 * State driven entirely by parent (VideoPlayer). No internal state machines.
 * All controls dispatch callbacks (onPlayPause, onSeek, onQualityChange, etc.)
 * and parent translates them into iframe commands.
 *
 * Auto-hide: overlay fades out after 4s of inactivity, returns on any D-pad input.
 *
 * Layout:
 *   ┌────────────────────────────────────────────┐
 *   │ [Back]   Title                  [Settings] │  ← top bar
 *   │                                            │
 *   │              [  ▶ / ❚❚  ]                  │  ← center play (idle only)
 *   │                                            │
 *   │ ━━━━●─────────── 12:34 / 45:00             │  ← seek bar
 *   │ [CC]  [1080p ▾]                    [⛶]    │  ← bottom controls
 *   └────────────────────────────────────────────┘
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { Play, Pause, ArrowLeft, Check, ChevronDown, Subtitles, Maximize, Minimize, RotateCcw, RotateCw } from 'lucide-react-native';
import { colors } from '@hijistream/shared/theme';
import TVFocusable from './TVFocusable';

const LANG_FLAGS = {
  id: '🇮🇩', en: '🇺🇸', es: '🇪🇸', pt: '🇧🇷', hi: '🇮🇳', ja: '🇯🇵', ko: '🇰🇷',
};
const LANG_NAMES = {
  id: 'Indonesian', en: 'English', es: 'Español', pt: 'Português',
  hi: 'हिन्दी', ja: '日本語', ko: '한국어',
};

const AUTO_HIDE_MS = 4000;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * @param {object} props
 * @param {string} props.title
 * @param {boolean} props.isPlaying
 * @param {number} props.currentTime
 * @param {number} props.duration
 * @param {string[]} [props.availableQualities] - e.g. ['1080p', '720p', '480p', '360p']
 * @param {string} [props.currentQuality]
 * @param {Array<{lang:string,url?:string,cached?:boolean}>} [props.subtitles]
 * @param {string} [props.selectedSubLang] - currently active lang code, 'off' for none
 * @param {boolean} [props.isFullscreen]
 * @param {boolean} props.buffering
 * @param {string} [props.errorMessage]
 * @param {() => void} props.onBack
 * @param {() => void} props.onPlayPause
 * @param {(sec:number) => void} props.onSeek
 * @param {(q:string) => void} [props.onQualityChange]
 * @param {(lang:string|null) => void} [props.onSubtitleChange] - null = off
 * @param {() => void} [props.onFullscreenToggle]
 * @param {() => void} [props.onRetry]
 */
export default function CustomPlayerOverlay({
  title,
  isPlaying,
  currentTime,
  duration,
  availableQualities = [],
  currentQuality,
  subtitles = [],
  selectedSubLang,
  isFullscreen = true,
  buffering = false,
  errorMessage,
  onBack,
  onPlayPause,
  onSeek,
  onQualityChange,
  onSubtitleChange,
  onFullscreenToggle,
  onRetry,
  showTrigger,
}) {
  const [visible, setVisible] = useState(true);
  const [showQuality, setShowQuality] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showCenterPlay, setShowCenterPlay] = useState(!isPlaying);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef(null);

  // ── Auto-hide logic ──────────────────────────────────────────────
  const show = useCallback(() => {
    console.warn('[Overlay] show() called, isPlaying=' + isPlaying);
    setVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isPlaying) {
      hideTimer.current = setTimeout(() => hide(), AUTO_HIDE_MS);
    }
  }, [isPlaying, fadeAnim]);

  const hide = useCallback(() => {
    console.warn('[Overlay] hide() called');
    setVisible(false);
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    setShowQuality(false);
    setShowSubtitle(false);
  }, [fadeAnim]);

  useEffect(() => {
    if (!isPlaying) {
      // Always visible when paused
      if (hideTimer.current) clearTimeout(hideTimer.current);
      show();
    } else {
      show();
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [isPlaying, show]);

  // Show center play button only when paused (idle)
  useEffect(() => {
    setShowCenterPlay(!isPlaying && !buffering);
  }, [isPlaying, buffering]);

  // ── D-pad wake: showTrigger changes → overlay reappears ──
  useEffect(() => {
    if (showTrigger > 0) {
      console.warn('[Overlay] wake showTrigger=' + showTrigger);
      show();
    }
  }, [showTrigger, show]);

  // ── Seek bar — TV uses +/-10s buttons. Bar is visual only (no tap-to-seek).
  const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const progressPct = `${(progress * 100).toFixed(2)}%`;

  // ── Render ──────────────────────────────────────────────────────
  if (errorMessage) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Player gagal dimuat</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        {onRetry && (
          <TVFocusable
            onPress={onRetry}
            style={styles.retryBtn}
            focusStyle={styles.retryBtnFocused}
            focusScale={1.05}
            hasTVPreferredFocus
          >
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TVFocusable>
        )}
        {onBack && (
          <TVFocusable
            onPress={onBack}
            style={styles.backErrorBtn}
            focusStyle={styles.backErrorBtnFocused}
            focusScale={1.05}
          >
            <Text style={styles.backErrorText}>Kembali</Text>
          </TVFocusable>
        )}
      </View>
    );
  }

  return (
    <Animated.View
      style={[styles.root, { opacity: fadeAnim }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Top gradient + bar */}
      <View style={styles.topBar}>
        <LinearGradientTop />
        <View style={styles.topBarContent}>
          <TVFocusable
            onPress={onBack}
            style={styles.iconButton}
            focusStyle={styles.iconButtonFocused}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={18} color="#fff" />
          </TVFocusable>
          <Text style={styles.title} numberOfLines={1}>{title || ''}</Text>
          <View style={{ width: 48 }} />
        </View>
      </View>

      {/* Center big play (idle) */}
      {showCenterPlay && !showQuality && !showSubtitle && (
        <View style={styles.centerContainer} pointerEvents="box-none">
          <TVFocusable
            onPress={onPlayPause}
            style={styles.centerPlayBtn}
            focusStyle={styles.centerPlayBtnFocused}
            focusScale={1.08}
            hasTVPreferredFocus={!isPlaying}
            accessibilityLabel="Play"
          >
            <Play size={36} color="#000" fill="#000" />
          </TVFocusable>
          {buffering && <Text style={styles.bufferingText}>Loading...</Text>}
        </View>
      )}

      {/* Bottom controls */}
      {!showQuality && !showSubtitle && (
        <View style={styles.bottomBar}>
          <LinearGradientBottom />
          <View style={styles.bottomContent}>
            {/* Seek bar (visual only) */}
            <View style={styles.seekBar}>
              <View style={styles.seekTrack} />
              <View style={[styles.seekFill, { width: progressPct }]} />
              <View style={[styles.seekThumb, { left: progressPct }]} />
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.controlsRow}>
              {/* Rewind 10s */}
              <TVFocusable
                onPress={() => onSeek(Math.max(0, currentTime - 10))}
                style={styles.iconButton}
                focusStyle={styles.iconButtonFocused}
                accessibilityLabel="Rewind 10 seconds"
              >
                <RotateCcw size={16} color="#fff" />
              </TVFocusable>

              {/* Play/Pause */}
              <TVFocusable
                onPress={onPlayPause}
                style={styles.playBtn}
                focusStyle={styles.playBtnFocused}
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} color="#000" fill="#000" /> : <Play size={20} color="#000" fill="#000" />}
              </TVFocusable>

              {/* Forward 10s */}
              <TVFocusable
                onPress={() => onSeek(Math.min(duration, currentTime + 10))}
                style={styles.iconButton}
                focusStyle={styles.iconButtonFocused}
                accessibilityLabel="Forward 10 seconds"
              >
                <RotateCw size={16} color="#fff" />
              </TVFocusable>

              <View style={{ flex: 1 }} />

              {/* Subtitle picker */}
              {subtitles.length > 0 && (
                <TVFocusable
                  onPress={() => setShowSubtitle(true)}
                  style={styles.pillButton}
                  focusStyle={styles.pillButtonFocused}
                  accessibilityLabel="Subtitle"
                >
                  <Subtitles size={14} color={selectedSubLang && selectedSubLang !== 'off' ? '#E50914' : '#fff'} />
                  <Text style={styles.pillText}>
                    {selectedSubLang && selectedSubLang !== 'off'
                      ? (LANG_FLAGS[selectedSubLang] || '🌐') + ' ' + selectedSubLang.toUpperCase()
                      : 'CC'}
                  </Text>
                  <ChevronDown size={12} color="#fff" />
                </TVFocusable>
              )}

              {/* Quality picker */}
              {availableQualities.length > 0 && (
                <TVFocusable
                  onPress={() => setShowQuality(true)}
                  style={styles.pillButton}
                  focusStyle={styles.pillButtonFocused}
                  accessibilityLabel="Quality"
                >
                  <Text style={styles.pillText}>{currentQuality || availableQualities[0]}</Text>
                  <ChevronDown size={12} color="#fff" />
                </TVFocusable>
              )}

              {/* Fullscreen toggle (no-op on TV since always fullscreen, kept for parity) */}
              {onFullscreenToggle && (
                <TVFocusable
                  onPress={onFullscreenToggle}
                  style={styles.iconButton}
                  focusStyle={styles.iconButtonFocused}
                  accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize size={16} color="#fff" /> : <Maximize size={16} color="#fff" />}
                </TVFocusable>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Quality modal */}
      {showQuality && (
        <ModalList
          title="Quality"
          options={availableQualities.map((q) => ({ value: q, label: q }))}
          current={currentQuality}
          onSelect={(v) => { onQualityChange?.(v); setShowQuality(false); }}
          onClose={() => setShowQuality(false)}
        />
      )}

      {/* Subtitle modal */}
      {showSubtitle && (
        <ModalList
          title="Subtitle"
          options={[
            { value: 'off', label: '✕  Off', subtitle: 'No subtitles' },
            ...subtitles.map((s) => ({
              value: s.lang,
              label: `${LANG_FLAGS[s.lang] || '🌐'}  ${(LANG_NAMES[s.lang] || s.lang)}`,
              subtitle: s.cached ? 'Cached' : null,
            })),
          ]}
          current={selectedSubLang || 'off'}
          onSelect={(v) => { onSubtitleChange?.(v === 'off' ? null : v); setShowSubtitle(false); }}
          onClose={() => setShowSubtitle(false)}
        />
      )}
    </Animated.View>
  );
}

// ── Modal list (quality / subtitle picker) ────────────────────────
function ModalList({ title, options, current, onSelect, onClose }) {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalDialog}>
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView style={styles.modalList} contentContainerStyle={{ gap: 8 }}>
          {options.map((opt, idx) => {
            const isCurrent = opt.value === current;
            return (
              <TVFocusable
                key={opt.value}
                onPress={() => onSelect(opt.value)}
                style={[styles.modalItem, isCurrent && styles.modalItemCurrent]}
                focusStyle={styles.modalItemFocused}
                focusScale={1.03}
                hasTVPreferredFocus={idx === 0}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalItemLabel}>{opt.label}</Text>
                  {opt.subtitle && <Text style={styles.modalItemSub}>{opt.subtitle}</Text>}
                </View>
                {isCurrent && <Check size={20} color={colors.primary} />}
              </TVFocusable>
            );
          })}
        </ScrollView>
        <TVFocusable
          onPress={onClose}
          style={styles.modalCloseBtn}
          focusStyle={styles.modalCloseBtnFocused}
        >
          <Text style={styles.modalCloseText}>Close</Text>
        </TVFocusable>
      </View>
    </View>
  );
}

// ── Top/Bottom gradient (fake, since LinearGradient needs extra setup) ──
function LinearGradientTop() {
  return <View style={styles.gradientTop} pointerEvents="none" />;
}
function LinearGradientBottom() {
  return <View style={styles.gradientBottom} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  gradientTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 140,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  gradientBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  topBar: { paddingTop: 16 },
  topBarContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 10, gap: 16,
  },
  title: {
    flex: 1, fontSize: 18, fontWeight: '700', color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4,
  },
  centerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  centerPlayBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'transparent',
  },
  centerPlayBtnFocused: {
    backgroundColor: '#fff',
    borderColor: '#E50914',
  },
  bufferingText: {
    color: '#fff', fontSize: 14, marginTop: 12, fontWeight: '600',
  },
  bottomBar: { paddingBottom: 16 },
  bottomContent: { paddingHorizontal: 24, paddingTop: 4 },
  seekBar: {
    height: 24, justifyContent: 'center',
  },
  seekTrack: {
    position: 'absolute', left: 0, right: 0, height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2,
  },
  seekFill: {
    position: 'absolute', left: 0, height: 4,
    backgroundColor: '#E50914', borderRadius: 2,
  },
  seekThumb: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#E50914', marginLeft: -6,
  },
  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 2, marginBottom: 8,
  },
  timeText: {
    color: '#fff', fontSize: 12, fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3,
  },
  controlsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  iconButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  iconButtonFocused: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#E50914',
  },
  playBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  playBtnFocused: {
    backgroundColor: '#fff',
    borderColor: '#E50914',
  },
  pillButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 18,
    borderWidth: 2, borderColor: 'transparent',
    minHeight: 36,
  },
  pillButtonFocused: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#E50914',
  },
  pillText: {
    color: '#fff', fontSize: 13, fontWeight: '600',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalDialog: {
    width: 380, maxHeight: '70%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12, padding: 16,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '700', color: '#fff',
    marginBottom: 12, textAlign: 'center',
  },
  modalList: { maxHeight: 300 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 2, borderColor: 'transparent',
  },
  modalItemCurrent: { borderColor: '#E50914', backgroundColor: 'rgba(229,9,20,0.1)' },
  modalItemFocused: { borderColor: '#fff' },
  modalItemLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalItemSub: { color: '#888', fontSize: 11, marginTop: 2 },
  modalCloseBtn: {
    marginTop: 12, paddingVertical: 8,
    backgroundColor: '#2a2a2a', borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  modalCloseBtnFocused: { borderColor: '#E50914', backgroundColor: '#3a3a3a' },
  modalCloseText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
    padding: 24, gap: 12,
  },
  errorTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  errorMessage: { color: '#888', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#E50914', borderRadius: 6,
    borderWidth: 2, borderColor: 'transparent',
  },
  retryBtnFocused: { borderColor: '#fff' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backErrorBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#2a2a2a', borderRadius: 6,
    borderWidth: 2, borderColor: 'transparent',
  },
  backErrorBtnFocused: { borderColor: '#fff' },
  backErrorText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
