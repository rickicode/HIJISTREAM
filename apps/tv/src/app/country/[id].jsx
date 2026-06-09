/**
 * CountryScreen - Country browse results for Android TV
 *
 * Features:
 * - Header bar with Back button and Title
 * - Dynamic compact grid of content by country
 * - TV remote D-pad navigation
 * - Load more on scroll
 * - Back button support
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, BackHandler, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { TMDB_COUNTRIES } from '@hijistream/shared/utils/api';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '@hijistream/shared/theme';
import TVFocusable from '../../components/TVFocusable';
import ContentCard from '../../components/ContentCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 48;
const GRID_GAP = 12;
const COLUMNS = 6;
const CARD_WIDTH = (SCREEN_WIDTH - (2 * GRID_PADDING) - ((COLUMNS - 1) * GRID_GAP)) / COLUMNS;

export default function CountryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const countryObj = TMDB_COUNTRIES.find(c => c.iso.toLowerCase() === id.toLowerCase() || c.code.toLowerCase() === id.toLowerCase());
  const countryName = countryObj ? `${countryObj.flag} ${countryObj.iso.toUpperCase()}` : 'Country';

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    loadData();
  }, [id, page]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getDiscoverByCountry('movie', id, page);
      if (page === 1) {
        setItems(data?.items || []);
      } else {
        setItems(prev => [...prev, ...(data?.items || [])]);
      }
    } catch (err) {
      console.error('Failed to load country:', err);
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <ContentCard item={item} type="movie" width="100%" />
    </View>
  );

  if (items.length === 0 && loading) {
    return (
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TVFocusable
            onPress={() => router.back()}
            style={styles.backButton}
            focusStyle={styles.backButtonFocused}
            focusScale={1.05}
            showFocusRing={false}
            accessibilityLabel="Go back"
            hasTVPreferredFocus
          >
            {({ isFocused }) => (
              <ArrowLeft size={18} color={isFocused ? '#000' : '#fff'} />
            )}
          </TVFocusable>
          <Text style={styles.title}>{countryName}</Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>HIJISTREAM</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TVFocusable
          onPress={() => router.back()}
          style={styles.backButton}
          focusStyle={styles.backButtonFocused}
          focusScale={1.05}
          showFocusRing={false}
          accessibilityLabel="Go back"
          hasTVPreferredFocus
        >
          {({ isFocused }) => (
            <ArrowLeft size={18} color={isFocused ? '#000' : '#fff'} />
          )}
        </TVFocusable>
        <Text style={styles.title}>{countryName}</Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        numColumns={6}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        onEndReached={() => setPage(p => p + 1)}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 48,
    paddingTop: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    height: 48,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  backButtonFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    fontFamily: 'Inter_700Bold',
  },
  grid: {
    paddingBottom: 32,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E50914',
    letterSpacing: 2,
    marginTop: 10,
    fontFamily: 'Inter_700Bold',
  },
});
