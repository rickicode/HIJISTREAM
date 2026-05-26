import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import TVFocusable from './TVFocusable';

export default function ContentCard({ item, type = 'movie', watchProgress = null }) {
  const router = useRouter();
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()).slice(0, 2) : [];

  const handlePress = () => {
    const effectiveType = item._detectedType || type;
    if (effectiveType === 'movie') {
      router.push(`/movie/${item.tmdb_id}`);
    } else {
      router.push(`/tv/${item.tmdb_id}`);
    }
  };

  return (
    <TVFocusable onPress={handlePress} style={styles.card}>
      <View style={styles.posterContainer}>
        <Image
          source={{ uri: item.poster_url }}
          style={styles.poster}
          resizeMode="cover"
        />
        {watchProgress != null && watchProgress > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${watchProgress}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          {item.year && <Text style={styles.metaText}>{item.year}</Text>}
          {item.rating && <Text style={styles.metaText}>&#9733; {item.rating}</Text>}
        </View>
        {genres.length > 0 && (
          <View style={styles.genreRow}>
            {genres.map((genre) => (
              <View key={genre} style={styles.genrePill}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TVFocusable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    minWidth: 80,
    minHeight: 80,
  },
  posterContainer: {
    aspectRatio: 2 / 3,
    backgroundColor: '#262626',
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#374151',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  info: {
    padding: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  genrePill: {
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  genreText: {
    color: '#9CA3AF',
    fontSize: 10,
  },
});
