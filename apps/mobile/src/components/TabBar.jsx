import { ScrollView, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
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
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    minWidth: 80,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    ...typography.subtitle,
    fontWeight: '400',
  },
  activeTabText: {
    color: colors.text,
    fontWeight: '700',
  },
});
