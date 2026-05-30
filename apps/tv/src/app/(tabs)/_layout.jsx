import { View, Text, StyleSheet } from 'react-native';
import { Tabs, useSegments, useRouter } from 'expo-router';
import { Search, Home, Grid3X3, Heart, User } from 'lucide-react-native';
import { colors, spacing } from '@hijistream/shared/theme';
import TVFocusable from '../../components/TVFocusable';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'browse', label: 'Browse', icon: Grid3X3 },
  { key: 'mylist', label: 'My List', icon: Heart },
  { key: 'profile', label: 'Profile', icon: User },
];

function TVTopNav() {
  const segments = useSegments();
  const router = useRouter();
  const activeTab = segments[1] || 'home';

  return (
    <View style={styles.topNav}>
      <Text style={styles.brand}>HIJISTREAM</Text>
      <View style={styles.navItems}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          const Icon = item.icon;
          return (
            <TVFocusable
              key={item.key}
              onPress={() => router.push(`/(tabs)/${item.key}`)}
              style={[styles.navItem, isActive && styles.navItemActive]}
              focusScale={1.05}
            >
              <Icon
                size={20}
                color={isActive ? colors.text : colors.textSecondary}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TVFocusable>
          );
        })}
      </View>
      <TVFocusable
        onPress={() => router.push('/search')}
        style={styles.searchButton}
        focusScale={1.1}
        accessibilityLabel="Search"
      >
        <Search size={24} color={colors.text} />
      </TVFocusable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <TVTopNav />
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  brand: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.xl,
  },
  navItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    gap: spacing.xs,
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  navLabel: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  navLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    left: spacing.md,
    right: spacing.md,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  searchButton: {
    padding: spacing.sm,
    borderRadius: 6,
  },
});
