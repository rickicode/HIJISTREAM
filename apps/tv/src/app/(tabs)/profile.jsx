/**
 * ProfileScreen — TV-optimized settings page
 *
 * Features:
 * - Large, TV-friendly settings list
 * - Language selection with TV-friendly modal
 * - Clear cache option with confirmation
 * - Red focus ring on all interactive items
 * - App version info at bottom
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { Globe, Trash2, ChevronRight } from 'lucide-react-native';
import { colors } from '@hijistream/shared/theme';
import { useTranslation, SUPPORTED_LOCALES } from '@hijistream/shared/i18n';
import cacheManager from '@hijistream/shared/utils/cache';
import TVFocusable from '../../components/TVFocusable';
import LanguageModal from '../../components/LanguageModal';

const SETTINGS_ITEMS = [
  {
    key: 'language',
    icon: Globe,
    label: 'Language',
    getValue: (locale) => {
      const found = SUPPORTED_LOCALES.find(l => l.code === locale);
      return found ? `${found.flag} ${found.nativeName}` : locale;
    },
    action: 'modal',
    color: '#6366F1', // indigo
  },
  {
    key: 'clear-cache',
    icon: Trash2,
    label: 'Clear Cache',
    subtitle: 'Free up storage space',
    action: 'clear',
    color: '#F59E0B', // amber
  },
];

export default function ProfileScreen() {
  const { locale } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  const handleClearCache = useCallback(async () => {
    try {
      await cacheManager.clear();
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  }, []);

  const handleItemPress = useCallback((item) => {
    if (item.action === 'modal') {
      setLangModalVisible(true);
    } else if (item.action === 'clear') {
      handleClearCache();
    }
  }, [handleClearCache]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>R</Text>
        </View>
        <View>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>Customize your HIJISTREAM experience</Text>
        </View>
      </View>

      {/* Settings list */}
      <View style={styles.menuList}>
        {SETTINGS_ITEMS.map((item) => {
          const Icon = item.icon;
          const value = item.getValue ? item.getValue(locale) : null;
          return (
            <TVFocusable
              key={item.key}
              onPress={() => handleItemPress(item)}
              style={styles.menuItem}
              focusStyle={[styles.menuItemFocused, { borderColor: item.color }]}
              focusScale={1.05}
              hasTVPreferredFocus={item.key === 'language'}
              accessibilityLabel={item.label}
            >
              {/* Icon container */}
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Icon size={26} color={item.color} strokeWidth={1.8} />
              </View>

              {/* Content */}
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.subtitle && (
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                )}
                {value && (
                  <Text style={styles.menuValue}>{value}</Text>
                )}
              </View>

              {/* Arrow */}
              <ChevronRight size={24} color="#666" strokeWidth={2} />
            </TVFocusable>
          );
        })}
      </View>

      {/* Version footer */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        <Text style={styles.version}>HIJISTREAM TV v1.0.0</Text>
        <Text style={styles.versionSub}>Built for Android TV</Text>
      </View>

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
    paddingLeft: 56,
    paddingRight: 56,
    paddingTop: 24,
    paddingBottom: 48,
  },

  /* ── Header ── */
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 40,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#808080',
    marginTop: 4,
  },

  /* ── Settings list ── */
  menuList: {
    width: '100%',
    maxWidth: 700,
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 22,
    borderRadius: 12,
    gap: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  menuItemFocused: {
    backgroundColor: '#222',
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  menuSubtitle: {
    fontSize: 15,
    color: '#808080',
    marginTop: 3,
  },
  menuValue: {
    fontSize: 17,
    color: '#b3b3b3',
    marginTop: 3,
  },

  /* ── Footer ── */
  footer: {
    marginTop: 48,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginBottom: 20,
  },
  version: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  versionSub: {
    fontSize: 13,
    color: '#444',
    marginTop: 2,
  },
});
