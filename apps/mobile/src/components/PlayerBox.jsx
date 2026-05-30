import { View, ImageBackground, StyleSheet, useWindowDimensions } from 'react-native';
import { Play } from 'lucide-react-native';
import { colors, borderRadius } from '@hijistream/shared/theme';
import TVFocusable from './TVFocusable';

export default function PlayerBox({ item, onPlay }) {
  const { width: screenWidth } = useWindowDimensions();
  const playerHeight = screenWidth * (9 / 16);
  const backdropUri = item.backdrop_url || item.poster_url;

  return (
    <View style={[styles.container, { width: screenWidth, height: playerHeight }]}>
      <ImageBackground
        source={{ uri: backdropUri }}
        style={styles.backdrop}
        resizeMode="cover"
      >
        <View style={styles.gradientOverlay1} />
        <View style={styles.gradientOverlay2} />
        <View style={styles.gradientOverlay3} />
        <TVFocusable onPress={onPlay} style={styles.playButton}>
          <Play color="#FFFFFF" size={32} fill="#FFFFFF" />
        </TVFocusable>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  backdrop: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,20,20,0.3)',
  },
  gradientOverlay2: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'rgba(20,20,20,0.7)',
  },
  gradientOverlay3: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 60,
    backgroundColor: 'rgba(20,20,20,0.5)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});
