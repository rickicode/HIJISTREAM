import { ScrollView, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import TVFocusable from './TVFocusable';

export default function TabBar({ tabs, activeTab, onTabChange, variant = 'default' }) {
  const isPill = variant === 'pill';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const tabStyle = isPill
          ? [styles.pillTab, isActive && styles.activePillTab]
          : [styles.tab, isActive && styles.activeTab];
        const textStyle = isPill
          ? [styles.pillTabText, isActive && styles.activePillTabText]
          : [styles.tabText, isActive && styles.activeTabText];
        return (
          <TVFocusable
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={tabStyle}
          >
            <Text style={textStyle}>
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
    gap: spacing.sm,
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
  pillTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillTab: {
    backgroundColor: colors.primary,
  },
  pillTabText: {
    color: colors.textSecondary,
    ...typography.body,
    fontWeight: '500',
  },
  activePillTabText: {
    color: colors.text,
    fontWeight: '700',
  },
});
