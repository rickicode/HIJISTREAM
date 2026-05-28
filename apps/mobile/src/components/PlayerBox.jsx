import { View, ImageBackground, StyleSheet, useWindowDimensions } from 'react-native';
import { Play } from 'lucide-react-native';
import { colors, borderRadius } from '../theme';
import TVFocusable from './TVFocusable';

export default function PlayerBox({ item, onPlay }) {
  const { width: screenWidth } = useWindowDimensions();
  // Full width backdrop, taller than the player to show backdrop around it
  const sectionHeight = screenWidth * (9 / 16) + 48;
  const playerWidth = screenWidth - 32; // small margin so backdrop peeks around edges
  const playerHeight = playerWidth * (9 / 16);
  const backdropUri = item.backdrop_url || item.poster_url;

  return (
    <View style={[styles.outerContainer, { width: screenWidth, height: sectionHeight }]}>
      {/* Full-width backdrop image as background */}
      <ImageBackground
        source={{ uri: backdropUri }}
        style={styles.backdrop}
        resizeMode="cover"
      >
        {/* Dark overlay */}
        <View style={styles.darkOverlay} />
        <View style={styles.topGradient} />
        <View style={styles.bottomGradient} />

        {/* Player box floating in the center over the backdrop */}
        <View style={[styles.playerBox, { width: playerWidth, height: playerHeight }]}>
          <TVFocusable onPress={onPlay} style={styles.playButton}>
            <Play color="#FFFFFF" size={32} fill="#FFFFFF" />
          </TVFocusable>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.background,
  },
  backdrop: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  topGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 50,
    backgroundColor: 'rgba(20,20,20,0.6)',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
    backgroundColor: 'rgba(20,20,20,0.7)',
  },
  playerBox: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
