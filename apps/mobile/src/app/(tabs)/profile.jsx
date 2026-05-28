import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { User, Globe, Trash2 } from 'lucide-react-native';
import { useTranslation } from '../../i18n';
import { colors, spacing, typography, borderRadius } from '../../theme';
import TVFocusable from '../../components/TVFocusable';
import LanguageModal from '../../components/LanguageModal';
import cacheManager from '../../utils/cache';

export default function ProfileScreen() {
  const { t, locale, locales } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const currentLang = locales.find((l) => l.code === locale);

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
        <TVFocusable
          onPress={() => setLangModalVisible(true)}
          style={styles.row}
        >
          <Globe color={colors.text} size={20} />
          <Text style={styles.rowLabel}>{t('profile.language')}</Text>
          <Text style={styles.rowValue}>
            {currentLang ? currentLang.nativeName : locale}
          </Text>
        </TVFocusable>

        <TVFocusable onPress={handleClearCache} style={styles.row}>
          <Trash2 color={colors.text} size={20} />
          <Text style={styles.rowLabel}>{t('profile.clearCache')}</Text>
        </TVFocusable>
      </View>

      <Text style={styles.version}>HIJISTREAM v1.0.0</Text>

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
