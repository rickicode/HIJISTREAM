import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import TVFocusable from './TVFocusable';
import useIsTV from '../hooks/useIsTV';

export default function TabBar({ tabs, activeTab, onTabChange, variant = 'default' }) {
  const isPill = variant === 'pill';
  const isTV = useIsTV();

  const content = tabs.map((tab, index) => {
    const isActive = tab.id === activeTab;
    const tabStyle = isPill
      ? [styles.pillTab, isTV && styles.pillTabTV, isActive && styles.activePillTab]
      : [styles.tab, isTV && styles.tabTV, isActive && styles.activeTab];
    const textStyle = isPill
      ? [styles.pillTabText, isTV && styles.pillTabTextTV, isActive && styles.activePillTabText]
      : [styles.tabText, isTV && styles.tabTextTV, isActive && styles.activeTabText];
    return (
      <TVFocusable
        key={tab.id}
        onPress={() => onTabChange(tab.id)}
        hasTVPreferredFocus={isTV && index === 0}
        style={tabStyle}
        accessibilityLabel={tab.label}
        accessibilityRole="tab"
      >
        <Text style={textStyle}>
          {tab.label}
        </Text>
      </TVFocusable>
    );
  });

  // On TV, use a simple row (no ScrollView) so D-pad focus works natively
  if (isTV) {
    return (
      <View style={[styles.container, styles.containerTV]}>
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {content}
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
  containerTV: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
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
  tabTV: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minWidth: 140,
    minHeight: 56,
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    ...typography.subtitle,
    fontWeight: '400',
  },
  tabTextTV: {
    fontSize: 20,
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
  pillTabTV: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
    borderRadius: 28,
  },
  activePillTab: {
    backgroundColor: colors.primary,
  },
  pillTabText: {
    color: colors.textSecondary,
    ...typography.body,
    fontWeight: '500',
  },
  pillTabTextTV: {
    fontSize: 18,
  },
  activePillTabText: {
    color: colors.text,
    fontWeight: '700',
  },
});
