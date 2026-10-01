import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { colors } from '@hijistream/shared/theme';
import { LanguageProvider } from '@hijistream/shared/i18n';
import api from '@hijistream/shared/utils/api';
import storage from '@hijistream/shared/utils/storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const pathname = usePathname();

  // Visitor analytics: one visit per route change, tagged as mobile.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let visitorId = await storage.getItem('hijistream_vid');
      if (!visitorId) {
        visitorId = `mob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await storage.setItem('hijistream_vid', visitorId);
      }
      if (!cancelled) {
        api.recordVisit({ visitorId, path: pathname, deviceType: 'mobile' });
      }
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);

  // Splash screen handling removed to use default native behavior

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SafeAreaProvider>
          <View style={styles.container}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
          </View>
        </SafeAreaProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
