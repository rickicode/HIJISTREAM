import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import { GENRE_IDS, TMDB_COUNTRIES } from '@hijistream/shared/utils/api';
import { useTranslation } from '@hijistream/shared/i18n';
import TVFocusable from '../../components/TVFocusable';

const GENRE_LIST = Object.entries(GENRE_IDS).map(([key, id]) => ({
  key,
  id,
  name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
}));

export default function BrowseScreen() {
  const [activeTab, setActiveTab] = useState('genre');
  const { t } = useTranslation();
  const router = useRouter();

  const handleGenrePress = (genreId) => {
    router.push({ pathname: '/genre/[id]', params: { id: genreId } });
  };

  const handleCountryPress = (countryCode) => {
    router.push({ pathname: '/country/[id]', params: { id: countryCode } });
  };

  const renderGenreItem = ({ item }) => (
    <TVFocusable
      onPress={() => handleGenrePress(item.id)}
      style={styles.gridCard}
      focusScale={1.08}
    >
      <Text style={styles.gridCardText}>
        {t(`genres.${item.key}`) || item.name}
      </Text>
    </TVFocusable>
  );

  const renderCountryItem = ({ item }) => (
    <TVFocusable
      onPress={() => handleCountryPress(item.iso)}
      style={styles.gridCard}
      focusScale={1.08}
    >
      <Text style={styles.gridCardFlag}>{item.flag}</Text>
      <Text style={styles.gridCardText}>{item.code.toUpperCase()}</Text>
    </TVFocusable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TVFocusable
          onPress={() => setActiveTab('genre')}
          style={[styles.tab, activeTab === 'genre' && styles.tabActive]}
          focusScale={1.05}
          hasTVPreferredFocus={activeTab === 'genre'}
        >
          <Text style={[styles.tabText, activeTab === 'genre' && styles.tabTextActive]}>
            Genre
          </Text>
        </TVFocusable>
        <TVFocusable
          onPress={() => setActiveTab('country')}
          style={[styles.tab, activeTab === 'country' && styles.tabActive]}
          focusScale={1.05}
        >
          <Text style={[styles.tabText, activeTab === 'country' && styles.tabTextActive]}>
            Country
          </Text>
        </TVFocusable>
      </View>

      {activeTab === 'genre' ? (
        <FlatList
          data={GENRE_LIST}
          renderItem={renderGenreItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={5}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      ) : (
        <FlatList
          data={TMDB_COUNTRIES}
          renderItem={renderCountryItem}
          keyExtractor={(item) => item.iso}
          numColumns={5}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
  },
  grid: {
    paddingBottom: spacing.xl,
  },
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  gridCard: {
    flex: 1,
    minHeight: 140,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  gridCardFlag: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  gridCardText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
