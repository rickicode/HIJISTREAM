import { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Home, Compass, Heart, User, Globe, Search } from 'lucide-react-native';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n';
import LanguageModal from '../../components/LanguageModal';
import TVFocusable from '../../components/TVFocusable';
import useIsTV from '../../hooks/useIsTV';

const ACTIVE_COLOR = colors.primary;
const INACTIVE_COLOR = '#7a7a7a';
const TAB_BG = '#0E0E0E';
const TV_TOP_BG = 'rgba(10,10,10,0.95)';
const TV_NAV_HEIGHT = 76;

// Telegram-style tab item: icon swaps to filled variant on active state,
// label is always visible and gets slightly heavier on active.
function makeTabIcon(IconComponent) {
  return function TabIcon({ focused, size }) {
    const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
    return (
      <IconComponent
        color={color}
        size={size}
        fill={focused ? color : 'transparent'}
        strokeWidth={focused ? 2 : 1.8}
      />
    );
  };
}

function makeTabLabel(label) {
  return function TabLabel({ focused }) {
    return (
      <Text
        style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    );
  };
}

/**
 * Top navigation bar for Android TV / Google TV.
 *
 * Rendered as a sibling above the Tabs navigator (not via the `tabBar` prop)
 * because react-navigation's bottom-tabs places its tab bar at the bottom of
 * the flex flow regardless of styling tricks. By living outside the Tabs we
 * have a clean column layout: top-nav (76dp) + tabs content (flex:1).
 *
 * Active route is detected via `useSegments()` so we don't depend on the
 * navigator's internal state. Navigation uses `router.push` against the
 * (tabs) route group so route persistence behaves the same as on phone.
 */
function TVTopNav({ items, onOpenSearch }) {
  const router = useRouter();
  const segments = useSegments();
  // Layout segments look like ['(tabs)', 'home']; pick the second segment.
  const active = segments[segments.length - 1] || items[0].name;

  return (
    <View style={tvNavStyles.container}>
      <View style={tvNavStyles.brand}>
        <Text style={tvNavStyles.brandText}>HIJISTREAM</Text>
      </View>
      <View style={tvNavStyles.itemRow}>
        {items.map((item, index) => {
          const isActive = active === item.name;
          return (
            <TVFocusable
              key={item.name}
              onPress={() => router.push(`/(tabs)/${item.name}`)}
              hasTVPreferredFocus={isActive && index === 0}
              style={[tvNavStyles.item, isActive && tvNavStyles.itemActive]}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
            >
              <Text
                style={[
                  tvNavStyles.itemText,
                  isActive && tvNavStyles.itemTextActive,
                ]}
              >
                {item.label}
              </Text>
              {isActive && <View style={tvNavStyles.activeUnderline} />}
            </TVFocusable>
          );
        })}
      </View>
      <View style={tvNavStyles.actions}>
        <TVFocusable
          onPress={onOpenSearch}
          style={tvNavStyles.actionButton}
          accessibilityLabel="Search"
        >
          <Search color="#FFFFFF" size={26} />
        </TVFocusable>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const isTV = useIsTV();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const tvNavItems = [
    { name: 'home', label: t('nav.home') },
    { name: 'browse', label: t('nav.browse') },
    { name: 'mylist', label: t('nav.myList') },
    { name: 'profile', label: t('nav.profile') },
  ];

  const tabsScreenOptions = {
    headerShown: !isTV,
    headerStyle: {
      backgroundColor: colors.background,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
    },
    headerTintColor: '#FFFFFF',
    headerRight: !isTV
      ? () => (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push('/search')}
              style={styles.headerButton}
              accessibilityLabel={t('nav.search')}
            >
              <Search color="#FFFFFF" size={22} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLangModalVisible(true)}
              style={styles.headerButton}
              accessibilityLabel={t('profile.language')}
            >
              <Globe color="#FFFFFF" size={22} />
            </TouchableOpacity>
          </View>
        )
      : undefined,
    tabBarHideOnKeyboard: true,
    // On TV we hide the bottom tab bar entirely — TVTopNav handles all nav.
    tabBarStyle: isTV
      ? { display: 'none', height: 0 }
      : {
          backgroundColor: TAB_BG,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
    tabBarActiveTintColor: ACTIVE_COLOR,
    tabBarInactiveTintColor: INACTIVE_COLOR,
    tabBarItemStyle: {
      paddingVertical: 2,
    },
  };

  return (
    <>
      <View style={styles.root}>
        {isTV && (
          <TVTopNav
            items={tvNavItems}
            onOpenSearch={() => router.push('/search')}
          />
        )}
        <View style={styles.body}>
          <Tabs screenOptions={tabsScreenOptions}>
            <Tabs.Screen
              name="home"
              options={{
                title: t('nav.home'),
                tabBarIcon: makeTabIcon(Home),
                tabBarLabel: makeTabLabel(t('nav.home')),
              }}
            />
            <Tabs.Screen
              name="browse"
              options={{
                title: t('nav.browse'),
                tabBarIcon: makeTabIcon(Compass),
                tabBarLabel: makeTabLabel(t('nav.browse')),
              }}
            />
            <Tabs.Screen
              name="mylist"
              options={{
                title: t('nav.myList'),
                tabBarIcon: makeTabIcon(Heart),
                tabBarLabel: makeTabLabel(t('nav.myList')),
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: t('nav.profile'),
                tabBarIcon: makeTabIcon(User),
                tabBarLabel: makeTabLabel(t('nav.profile')),
              }}
            />
          </Tabs>
        </View>
      </View>
      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  headerButton: {
    padding: 6,
    marginLeft: 4,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
  labelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },
  labelInactive: {
    color: INACTIVE_COLOR,
    fontWeight: '500',
  },
});

const tvNavStyles = StyleSheet.create({
  container: {
    height: TV_NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: TV_TOP_BG,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  brand: {
    marginRight: spacing.lg,
  },
  brandText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  itemRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  item: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  itemActive: {
    backgroundColor: 'rgba(229,9,20,0.12)',
  },
  itemText: {
    color: '#B3B3B3',
    fontSize: 17,
    fontWeight: '500',
  },
  itemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 4,
    left: spacing.md,
    right: spacing.md,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  actionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
