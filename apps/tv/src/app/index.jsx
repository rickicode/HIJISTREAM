import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors } from '@hijistream/shared/theme';

export default function Index() {
  console.log('HIJISTREAM TV index mounted');

  return (
    <View style={styles.container}>
      <Redirect href="/(tabs)/home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
