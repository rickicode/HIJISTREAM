import { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '../../i18n';
import { GENRE_IDS, TMDB_COUNTRIES } from '../../utils/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import TabBar from '../../components/TabBar';
import TVFocusable from '../../components/TVFocusable';

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

  const genreKeys = Object.keys(GENRE_IDS);

  const renderGenreCard = ({ item: genreKey }) => {
    const genreId = GENRE_IDS[genreKey];
    return (
      <TVFocusable
        onPress={() => router.push(`/genre/${genreId}`)}
        style={styles.card}
      >
        <Text style={styles.cardText}>{t(`genres.${genreKey}`)}</Text>
      </TVFocusable>
    );
  };

  const renderCountryCard = ({ item: country }) => (
    <TVFocusable
      onPress={() => router.push(`/country/${country.iso}`)}
      style={styles.card}
    >
      <Text style={styles.flagText}>{country.flag}</Text>
      <Text style={styles.cardText}>{t(`countries.${country.code}`)}</Text>
    </TVFocusable>
  );

  const renderSkeletonGrid = () => (
    <FlatList
      data={Array.from({ length: 8 }, (_, i) => ({ id: String(i) }))}
      numColumns={2}
      keyExtractor={(item) => item.id}
      renderItem={() => <SkeletonCard />}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.gridContainer}
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
          numColumns={2}
          keyExtractor={(item) => item}
          renderItem={renderGenreCard}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContainer}
        />
      ) : (
        <FlatList
          data={TMDB_COUNTRIES}
          numColumns={2}
          keyExtractor={(item) => item.iso}
          renderItem={renderCountryCard}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContainer}
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
  cardText: {
    color: colors.text,
    ...typography.subtitle,
    textAlign: 'center',
  },
  flagText: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  skeletonText: {
    width: '60%',
    height: 16,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
  },
});
