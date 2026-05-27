import { View, Text, Image, StyleSheet } from 'react-native';
import { Play, Star } from 'lucide-react-native';
import TVFocusable from './TVFocusable';

export default function DetailHero({ item, type: _type = 'movie', onPlay }) {
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()) : [];

  return (
    <View style={styles.container}>
      <View style={styles.posterContainer}>
        <Image
          source={{ uri: item.poster_url }}
          style={styles.poster}
          resizeMode="cover"
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.metaRow}>
          {item.year && <Text style={styles.metaText}>{item.year}</Text>}
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Star color="#EAB308" size={14} fill="#EAB308" />
              <Text style={styles.metaText}>{item.rating}</Text>
            </View>
          )}
          {item.runtime && (
            <Text style={styles.metaText}>{item.runtime} min</Text>
          )}
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
        {item.overview && (
          <Text style={styles.overview} numberOfLines={5}>
            {item.overview}
          </Text>
        )}
        {onPlay && (
          <TVFocusable onPress={onPlay} style={styles.playButton}>
            <Play color="#FFFFFF" size={20} fill="#FFFFFF" />
            <Text style={styles.playText}>Play</Text>
          </TVFocusable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 40,
    gap: 24,
  },
  posterContainer: {
    width: 250,
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#262626',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  genrePill: {
    backgroundColor: '#262626',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  genreText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  overview: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    alignSelf: 'flex-start',
    minWidth: 140,
    minHeight: 50,
  },
  playText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
