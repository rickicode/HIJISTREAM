import { View, Text, FlatList, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@hijistream/shared/theme';
import { useMyListItems } from '@hijistream/shared/hooks/useMyList';
import ContentCard from '../../components/ContentCard';
import TVTopNav from '../../components/TVTopNav';
import TVFocusable from '../../components/TVFocusable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 48;
const GRID_GAP = 12;
const COLUMNS = 6;
const CARD_WIDTH = (SCREEN_WIDTH - (2 * GRID_PADDING) - ((COLUMNS - 1) * GRID_GAP)) / COLUMNS;

export default function MyListScreen() {
  const router = useRouter();
  const { items, loading } = useMyListItems();

  if (loading) {
    return (
      <View style={styles.container}>
        <TVTopNav />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>HIJISTREAM</Text>
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <TVTopNav />
        <View style={styles.contentWrapperEmpty}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyTitle}>Your List is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Add movies and TV shows to your list to watch them later.
          </Text>
          <TVFocusable
            onPress={() => router.push('/(tabs)/home')}
            style={styles.exploreButton}
            focusStyle={styles.exploreButtonFocused}
            focusScale={1.05}
            showFocusRing={false}
          >
            {({ isFocused }) => (
              <Text style={[styles.exploreText, isFocused && styles.exploreTextFocused]}>
                Explore Home
              </Text>
            )}
          </TVFocusable>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <ContentCard item={item} type={item.type || 'movie'} width="100%" />
    </View>
  );

  return (
    <View style={styles.container}>
      <TVTopNav />
      <View style={styles.contentWrapper}>
        <Text style={styles.title}>My List</Text>
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={6}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 48,
    paddingTop: 8,
  },
  contentWrapperEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingBottom: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: -0.5,
    fontFamily: 'Inter_700Bold',
  },
  grid: {
    paddingBottom: 24,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Inter_700Bold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  exploreButton: {
    marginTop: 24,
    backgroundColor: '#E50914',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 6,
  },
  exploreButtonFocused: {
    backgroundColor: '#ffffff',
  },
  exploreText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  exploreTextFocused: {
    color: '#000000',
  },
  loading: {
    flex: 1,
    backgroundColor: '#141414',
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

