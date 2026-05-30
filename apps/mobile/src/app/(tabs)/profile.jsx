import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import Constants from 'expo-constants';
import { User, Globe, Trash2 } from 'lucide-react-native';
import { useTranslation } from '@hijistream/shared/i18n';
import { colors, spacing, typography, borderRadius } from '@hijistream/shared/theme';
import LanguageModal from '../../components/LanguageModal';
import cacheManager from '@hijistream/shared/utils/cache';

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
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <User color={colors.textMuted} size={48} />
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={() => setLangModalVisible(true)}
          style={styles.row}
          accessibilityLabel={t('profile.language')}
        >
          <Globe color={colors.text} size={20} />
          <Text style={styles.rowLabel}>
            {t('profile.language')}
          </Text>
          <Text style={styles.rowValue}>
            {currentLang ? currentLang.nativeName : locale}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleClearCache}
          style={styles.row}
          accessibilityLabel={t('profile.clearCache')}
        >
          <Trash2 color={colors.text} size={20} />
          <Text style={styles.rowLabel}>
            {t('profile.clearCache')}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.version}>{versionLabel}</Text>

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
  avatarContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowLabel: {
    color: colors.text,
    ...typography.subtitle,
    flex: 1,
  },
  rowValue: {
    color: colors.textMuted,
    ...typography.body,
  },
  version: {
    color: colors.textMuted,
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
