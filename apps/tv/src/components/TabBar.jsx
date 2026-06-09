/**
 * TabBar - TV remote-friendly tab selector
 *
 * Used for tab switching on browse/filter screens.
 * Fully D-pad navigable with TVFocusable.
 */

import { View, Text, StyleSheet } from 'react-native';
import TVFocusable from './TVFocusable';

export default function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TVFocusable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
            focusStyle={styles.tabFocused}
            focusScale={1.05}
            hasTVPreferredFocus={isActive}
            accessibilityLabel={tab.label}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TVFocusable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tabActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  tabFocused: {
    borderColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b3b3b3',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
