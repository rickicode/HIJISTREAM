import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Constants from 'expo-constants';
import { User, Globe, Trash2 } from 'lucide-react-native';
import { useTranslation } from '@hijistream/shared/i18n';
import { colors, spacing, typography, borderRadius } from '@hijistream/shared/theme';
import TVFocusable from '../../components/TVFocusable';
import LanguageModal from '../../components/LanguageModal';
import cacheManager from '@hijistream/shared/utils/cache';
import useIsTV from '../../hooks/useIsTV';

/**
 * Resolve the running app version from Expo's build-time config rather than
 * a hardcoded literal. Order of preference:
 *   1. nativeAppVersion        — set by Expo Application Services from the
 *                                actual `versionName` baked into the APK.
 *   2. expoConfig.version      — value from app.json at build time (matches
 *                                what shows in package metadata).
 *   3. manifest.version        — legacy classic-build fallback.
 *   4. 'dev'                   — last resort (Metro / web preview).
 *
 * On a release APK the first option is populated, so the user always sees the
 * version they actually installed, not whatever was hardcoded in the JSX.
 */
function getAppVersion() {
  return (
    Constants.nativeAppVersion ||
    Constants.expoConfig?.version ||
    Constants.manifest?.version ||
    'dev'
  );
}

function getAppBuildNumber() {
  return (
    Constants.nativeBuildVersion ||
    Constants.expoConfig?.android?.versionCode ||
    null
  );
}

export default function ProfileScreen() {
  const { t, locale, locales } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const isTV = useIsTV();

  const currentLang = locales.find((l) => l.code === locale);
  const version = getAppVersion();
  const build = getAppBuildNumber();
  const versionLabel = build ? `HIJISTREAM v${version} (${build})` : `HIJISTREAM v${version}`;

  const handleClearCache = async () => {
    try {
      await cacheManager.clear();
      Alert.alert(t('profile.clearCache'), 'Cache cleared successfully');
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, isTV && styles.containerTV]}>
      <View style={[styles.avatarContainer, isTV && styles.avatarContainerTV]}>
        <View style={[styles.avatar, isTV && styles.avatarTV]}>
          <User color={colors.textMuted} size={isTV ? 80 : 48} />
        </View>
      </View>

      <View style={[styles.section, isTV && styles.sectionTV]}>
        <TVFocusable
          onPress={() => setLangModalVisible(true)}
          hasTVPreferredFocus={isTV}
          style={[styles.row, isTV && styles.rowTV]}
          accessibilityLabel={t('profile.language')}
        >
          <Globe color={colors.text} size={isTV ? 28 : 20} />
          <Text style={[styles.rowLabel, isTV && styles.rowLabelTV]}>
            {t('profile.language')}
          </Text>
          <Text style={[styles.rowValue, isTV && styles.rowValueTV]}>
            {currentLang ? currentLang.nativeName : locale}
          </Text>
        </TVFocusable>

        <TVFocusable
          onPress={handleClearCache}
          style={[styles.row, isTV && styles.rowTV]}
          accessibilityLabel={t('profile.clearCache')}
        >
          <Trash2 color={colors.text} size={isTV ? 28 : 20} />
          <Text style={[styles.rowLabel, isTV && styles.rowLabelTV]}>
            {t('profile.clearCache')}
          </Text>
        </TVFocusable>
      </View>

      <Text style={[styles.version, isTV && styles.versionTV]}>{versionLabel}</Text>

      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  containerTV: {
    paddingHorizontal: 120,
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  avatarContainerTV: {
    marginVertical: spacing.xxl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTV: {
    width: 160,
    height: 160,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTV: {
    marginTop: spacing.xxl,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowTV: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderBottomWidth: 0,
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  rowLabel: {
    color: colors.text,
    ...typography.subtitle,
    flex: 1,
  },
  rowLabelTV: {
    fontSize: 22,
    fontWeight: '600',
  },
  rowValue: {
    color: colors.textMuted,
    ...typography.body,
  },
  rowValueTV: {
    fontSize: 18,
  },
  version: {
    color: colors.textMuted,
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  versionTV: {
    fontSize: 14,
    marginTop: spacing.xl,
  },
});
