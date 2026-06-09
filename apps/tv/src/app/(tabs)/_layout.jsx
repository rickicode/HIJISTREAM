/**
 * TabLayout — Netflix-style top navigation for Android TV
 *
 * Features:
 * - Netflix logo left, nav items center, search right
 * - Red focus ring on ALL nav items (no more invisible focus)
 * - Active tab indicator (red underline)
 * - Focused nav item gets red background tint
 * - TV remote D-pad navigation between items
 * - Proper focus management with nextFocus* routing
 */

import { View, Text, StyleSheet } from 'react-native';
import { Tabs, useSegments, useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { colors } from '@hijistream/shared/theme';
import TVFocusable from '../../components/TVFocusable';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', path: '/(tabs)/home' },
  { key: 'browse', label: 'Browse', path: '/(tabs)/browse' },
  { key: 'mylist', label: 'My List', path: '/(tabs)/mylist' },
  { key: 'profile', label: 'Profile', path: '/(tabs)/profile' },
];

function NetflixTopNav() {
  const segments = useSegments();
  const router = useRouter();
  const activeTab = segments[1] || 'home';

  return (
    <View style={styles.topNav}>
      {/* Logo */}
      <TVFocusable
        onPress={() => router.push('/(tabs)/home')}
        style={styles.logoContainer}
        focusScale={1.05}
        showFocusRing={false}
        accessibilityLabel="Home"
      >
        <Text style={styles.logo}>HIJISTREAM</Text>
      </TVFocusable>

      {/* Nav items — ALL have red focus ring so user knows
          which item the remote is pointing at, even when
          it's not the active tab. */}
      <View style={styles.navItems}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TVFocusable
              key={item.key}
              onPress={() => router.push(item.path)}
              style={[styles.navItem, isActive && styles.navItemActive]}
              focusStyle={styles.navItemFocused}
              focusScale={1.08}
              showFocusRing={false}
              accessibilityLabel={item.label}
            >
              {({ isFocused }) => (
                <>
                  <Text style={[
                    styles.navLabel,
                    isActive && styles.navLabelActive,
                    isFocused && styles.navLabelFocused
                  ]}>
                    {item.label}
                  </Text>
                  {isActive && <View style={styles.activeIndicator} />}
                </>
              )}
            </TVFocusable>
          );
        })}
      </View>

      {/* Search */}
      <TVFocusable
        onPress={() => router.push('/search')}
        style={styles.searchButton}
        focusStyle={styles.searchButtonFocused}
        focusScale={1.08}
        showFocusRing={false}
        accessibilityLabel="Search"
      >
        {({ isFocused }) => (
          <Search size={24} color={isFocused ? colors.primary : "#fff"} />
        )}
      </TVFocusable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <NetflixTopNav />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none', height: 0 },
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="browse" options={{ title: 'Browse' }} />
        <Tabs.Screen name="mylist" options={{ title: 'My List' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 56,
    backgroundColor: 'rgba(20,20,20,0.95)',
    zIndex: 100,
  },
  logoContainer: {
    marginRight: 32,
    paddingVertical: 4,
  },
  logo: {
    fontSize: 30,
    fontWeight: '900',
    color: '#E50914',
    letterSpacing: 1.5,
  },
  navItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navItem: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    position: 'relative',
    marginHorizontal: 2,
  },
  navItemActive: {
    // Active state is indicated by the red underline, not background
  },
  navItemFocused: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)', // subtle red tint on focus
  },
  navLabel: {
    fontSize: 17,
    color: '#b3b3b3',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  navLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  navLabelFocused: {
    color: '#fff',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  searchButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  searchButtonFocused: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
  },
});
