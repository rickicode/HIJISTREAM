import { ScrollView, Text, StyleSheet } from 'react-native';
import TVFocusable from './TVFocusable';

export default function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <TVFocusable
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TVFocusable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 40,
    paddingVertical: 8,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    minWidth: 80,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '400',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
