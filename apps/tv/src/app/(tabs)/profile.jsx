import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, Globe, Trash2 } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import { useTranslation, SUPPORTED_LOCALES } from '@hijistream/shared/i18n';
import cacheManager from '@hijistream/shared/utils/cache';
import TVFocusable from '../../components/TVFocusable';
import LanguageModal from '../../components/LanguageModal';

export default function ProfileScreen() {
  const { locale } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const currentLocale = SUPPORTED_LOCALES.find(l => l.code === locale);

  const handleClearCache = async () => {
    try {
      await cacheManager.clearAll();
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <User size={64} color={colors.text} />
        </View>
        <Text style={styles.appName}>HIJISTREAM TV</Text>
      </View>

      <View style={styles.menuList}>
        <TVFocusable
          onPress={() => setLangModalVisible(true)}
          style={styles.menuItem}
          focusScale={1.03}
          hasTVPreferredFocus
        >
          <Globe size={24} color={colors.text} />
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Language</Text>
            <Text style={styles.menuValue}>
              {currentLocale ? `${currentLocale.flag} ${currentLocale.nativeName}` : locale}
            </Text>
          </View>
        </TVFocusable>

        <TVFocusable
          onPress={handleClearCache}
          style={styles.menuItem}
          focusScale={1.03}
        >
          <Trash2 size={24} color={colors.text} />
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Clear Cache</Text>
            <Text style={styles.menuValue}>Free up storage space</Text>
          </View>
        </TVFocusable>
      </View>

      <Text style={styles.version}>Version 1.0.0</Text>

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
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  menuList: {
    width: '100%',
    maxWidth: 500,
    gap: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  menuValue: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  version: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
