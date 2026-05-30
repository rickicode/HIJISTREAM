import { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Animated, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@hijistream/shared/i18n';
import { GENRE_IDS, TMDB_COUNTRIES } from '@hijistream/shared/utils/api';
import { colors, spacing, typography, borderRadius } from '@hijistream/shared/theme';
import TabBar from '../../components/TabBar';

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

  const numColumns = 2;
  const genreKeys = Object.keys(GENRE_IDS);

  const renderGenreCard = ({ item: genreKey }) => {
    const genreId = GENRE_IDS[genreKey];
    return (
      <Pressable
        onPress={() => router.push(`/genre/${genreId}`)}
        style={styles.card}
        accessibilityLabel={t(`genres.${genreKey}`)}
      >
        <Text style={styles.cardText}>
          {t(`genres.${genreKey}`)}
        </Text>
      </Pressable>
    );
  };

  const renderCountryCard = ({ item: country }) => (
    <Pressable
      onPress={() => router.push(`/country/${country.iso}`)}
      style={styles.card}
      accessibilityLabel={t(`countries.${country.code}`)}
    >
      <Text style={styles.flagText}>{country.flag}</Text>
      <Text style={styles.cardText}>
        {t(`countries.${country.code}`)}
      </Text>
    </Pressable>
  );

  const renderSkeletonGrid = () => (
    <FlatList
      data={Array.from({ length: numColumns * 4 }, (_, i) => ({ id: String(i) }))}
      numColumns={numColumns}
      key={`skeleton-${numColumns}`}
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
          numColumns={numColumns}
          key={`genre-${numColumns}`}
          keyExtractor={(item) => item}
          renderItem={renderGenreCard}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContainer}
        />
      ) : (
        <FlatList
          data={TMDB_COUNTRIES}
          numColumns={numColumns}
          key={`country-${numColumns}`}
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
