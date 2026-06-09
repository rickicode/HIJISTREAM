/**
 * TVTopNav — Minimalist, non-sticky transparent top navigation bar for Android TV
 */

import { View, Text, StyleSheet } from 'react-native';
import { useSegments, useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { colors } from '@hijistream/shared/theme';
import TVFocusable from './TVFocusable';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', path: '/(tabs)/home' },
  { key: 'browse', label: 'Browse', path: '/(tabs)/browse' },
  { key: 'mylist', label: 'My List', path: '/(tabs)/mylist' },
  { key: 'profile', label: 'Profile', path: '/(tabs)/profile' },
];

export default function TVTopNav() {
  const segments = useSegments();
  const router = useRouter();
  const activeTab = segments[1] || 'home';

  return (
    <View style={styles.topNav}>
      {/* Logo */}
      <TVFocusable
        onPress={() => router.push('/(tabs)/home')}
        style={styles.logoContainer}
        focusScale={1.03}
        showFocusRing={false}
        accessibilityLabel="Home"
      >
        <Text style={styles.logo}>HIJISTREAM</Text>
      </TVFocusable>

      {/* Nav items */}
      <View style={styles.navItems}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TVFocusable
              key={item.key}
              onPress={() => router.push(item.path)}
              style={styles.navItem}
              focusScale={1.1}
              showFocusRing={false}
              accessibilityLabel={item.label}
            >
              {({ isFocused }) => (
                <View style={styles.navItemInner}>
                  <Text style={[
                    styles.navLabel,
                    isActive && styles.navLabelActive,
                    isFocused && styles.navLabelFocused
                  ]}>
                    {item.label}
                  </Text>
                  {isActive && <View style={styles.activeIndicator} />}
                </View>
              )}
            </TVFocusable>
          );
        })}
      </View>

      {/* Search */}
      <TVFocusable
        onPress={() => router.push('/search')}
        style={styles.searchButton}
        focusScale={1.1}
        showFocusRing={false}
        accessibilityLabel="Search"
      >
        {({ isFocused }) => (
          <Search size={20} color={isFocused ? '#E50914' : "#b3b3b3"} />
        )}
      </TVFocusable>
    </View>
  );
}

const styles = StyleSheet.create({
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
    paddingHorizontal: 48,
    backgroundColor: 'transparent',
    width: '100%',
    zIndex: 100,
  },
  logoContainer: {
    marginRight: 40,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E50914',
    letterSpacing: 1,
    fontFamily: 'Inter_700Bold',
  },
  navItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28, // Spacious navigation gap
  },
  navItem: {
    paddingVertical: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navLabel: {
    fontSize: 15,
    color: '#999999',
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.3,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  navLabelFocused: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E50914',
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
