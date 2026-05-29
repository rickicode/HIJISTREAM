import { Platform, useWindowDimensions } from 'react-native';

/**
 * Detect whether the app is running on Android TV / Google TV.
 *
 * `Platform.isTV` is set by React Native at runtime when Android's UiModeManager
 * reports `UI_MODE_TYPE_TELEVISION`. It does NOT depend on the AndroidManifest
 * declaring leanback support — that flag controls launcher visibility, not the
 * runtime detection. So this works reliably on real TV devices regardless of
 * whether the LEANBACK_LAUNCHER intent-filter is present.
 *
 * As a safety net for edge devices (some Chinese set-top boxes return
 * UI_MODE_TYPE_NORMAL even when running in TV mode), we also treat very wide
 * landscape viewports (>=960dp wide AND landscape) as TV. This avoids false
 * positives on tablets — phones and tablets in landscape rarely exceed 1024dp
 * width, while TVs report 1280dp+ in dp.
 *
 * Use this hook to gate TV-specific layout (bigger cards, top-nav, etc.).
 */
export default function useIsTV() {
  const { width, height } = useWindowDimensions();

  if (Platform.isTV) return true;

  // Heuristic fallback for set-top boxes that don't advertise UI_MODE_TYPE_TELEVISION.
  // Conservative threshold: 1280dp width is unmistakably TV territory.
  if (Platform.OS === 'android' && width >= 1280 && width > height) {
    return true;
  }

  return false;
}

/**
 * Static check — useful in module scope where hooks aren't available
 * (e.g. inside StyleSheet.create or one-shot helpers). Doesn't catch the
 * dimension-based fallback, only Platform.isTV.
 */
export const isTV = Platform.isTV === true;
