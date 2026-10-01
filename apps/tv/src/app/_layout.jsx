/**
 * RootLayout - Root layout for Android TV
 *
 * Sets up:
 * - QueryClientProvider for React Query
 * - SafeAreaProvider for safe area handling
 * - LanguageProvider for i18n
 * - Font loading (Inter)
 * - Stack navigator
 * - TV-optimized: forces landscape, no header
 */

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

if (typeof SharedArrayBuffer === 'undefined') {
  global.SharedArrayBuffer = ArrayBuffer;
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { LanguageProvider } from '@hijistream/shared/i18n';
import { usePathname } from 'expo-router';
import api from '@hijistream/shared/utils/api';
import storage from '@hijistream/shared/utils/storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  console.log("RootLayout is executing!");
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const pathname = usePathname();

  // Visitor analytics: record a visit per route change, tagged as TV so the
  // admin dashboard's device breakdown distinguishes kiosks from web.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let visitorId = await storage.getItem('hijistream_vid');
      if (!visitorId) {
        visitorId = `tv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await storage.setItem('hijistream_vid', visitorId);
      }
      if (!cancelled) {
        api.recordVisit({ visitorId, path: pathname, deviceType: 'tv' });
      }
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <SafeAreaProvider>
            <View style={styles.container}>
              <StatusBar style="light" hidden />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#141414' },
                  animation: 'fade',
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="search"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                />
                <Stack.Screen
                  name="player"
                  options={{
                    headerShown: false,
                    animation: 'fade',
                  }}
                />
                <Stack.Screen
                  name="movie/[id]"
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="tv/[id]"
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="genre/[id]"
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="country/[id]"
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="list/[type]"
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
              </Stack>
            </View>
          </SafeAreaProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#141414',
  },
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
});
