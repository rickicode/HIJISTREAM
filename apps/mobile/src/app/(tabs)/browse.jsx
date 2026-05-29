import { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '../../i18n';
import { GENRE_IDS, TMDB_COUNTRIES } from '../../utils/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import TabBar from '../../components/TabBar';
import TVFocusable from '../../components/TVFocusable';
import useIsTV from '../../hooks/useIsTV';

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.skeletonText} />
    </Animated.View>
  );
}

export default function BrowseScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const isTV = useIsTV();
  const [activeTab, setActiveTab] = useState('genre');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const tabs = [
    { id: 'genre', label: t('browse.genreTab') },
    { id: 'country', label: t('browse.countryTab') },
  ];

  // TV uses 5 columns of larger cards; phone keeps 2 columns. The grid has
  // to fit comfortably in the focus-ring scale so we leave room for the 1.06
  // zoom plus padding around each card.
  const numColumns = isTV ? 5 : 2;
  const genreKeys = Object.keys(GENRE_IDS);

  const renderGenreCard = ({ item: genreKey, index }) => {
    const genreId = GENRE_IDS[genreKey];
    return (
      <TVFocusable
        onPress={() => router.push(`/genre/${genreId}`)}
        hasTVPreferredFocus={isTV && index === 0}
        style={[styles.card, isTV && styles.cardTV]}
        accessibilityLabel={t(`genres.${genreKey}`)}
      >
        <Text style={[styles.cardText, isTV && styles.cardTextTV]}>
          {t(`genres.${genreKey}`)}
        </Text>
      </TVFocusable>
    );
  };

  const renderCountryCard = ({ item: country, index }) => (
    <TVFocusable
      onPress={() => router.push(`/country/${country.iso}`)}
      hasTVPreferredFocus={isTV && index === 0}
      style={[styles.card, isTV && styles.cardTV]}
      accessibilityLabel={t(`countries.${country.code}`)}
    >
      <Text style={[styles.flagText, isTV && styles.flagTextTV]}>{country.flag}</Text>
      <Text style={[styles.cardText, isTV && styles.cardTextTV]}>
        {t(`countries.${country.code}`)}
      </Text>
    </TVFocusable>
  );

  const renderSkeletonGrid = () => (
    <FlatList
      data={Array.from({ length: numColumns * 4 }, (_, i) => ({ id: String(i) }))}
      numColumns={numColumns}
      key={`skeleton-${numColumns}`}
      keyExtractor={(item) => item.id}
      renderItem={() => <SkeletonCard />}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.gridContainer, isTV && styles.gridContainerTV]}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        {renderSkeletonGrid()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'genre' ? (
        <FlatList
          data={genreKeys}
          numColumns={numColumns}
          key={`genre-${numColumns}`}
          keyExtractor={(item) => item}
          renderItem={renderGenreCard}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.gridContainer, isTV && styles.gridContainerTV]}
        />
      ) : (
        <FlatList
          data={TMDB_COUNTRIES}
          numColumns={numColumns}
          key={`country-${numColumns}`}
          keyExtractor={(item) => item.iso}
          renderItem={renderCountryCard}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.gridContainer, isTV && styles.gridContainerTV]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gridContainer: {
    padding: spacing.md,
  },
  gridContainerTV: {
    padding: spacing.xxl,
  },
  row: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  cardTV: {
    minHeight: 140,
    padding: spacing.lg,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.sm,
  },
  cardText: {
    color: colors.text,
    ...typography.subtitle,
    textAlign: 'center',
  },
  cardTextTV: {
    fontSize: 22,
    fontWeight: '600',
  },
  flagText: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  flagTextTV: {
    fontSize: 44,
    marginBottom: spacing.sm,
  },
  skeletonText: {
    width: '60%',
    height: 16,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
  },
});
