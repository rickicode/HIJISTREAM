import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Film, Tv, Search, Sparkles } from 'lucide-react-native';
import { colors } from '../../theme';
import { getCurrentLanguage, setLanguage } from '../../utils/language';

function LanguageSelector() {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    getCurrentLanguage().then(setLang);
  }, []);

  const handleLangChange = async (newLang) => {
    await setLanguage(newLang);
    setLang(newLang);
  };

  return (
    <View style={langStyles.container}>
      <TouchableOpacity onPress={() => handleLangChange('en')}>
        <Text style={lang === 'en' ? langStyles.active : langStyles.inactive}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleLangChange('id')}>
        <Text style={lang === 'id' ? langStyles.active : langStyles.inactive}>ID</Text>
      </TouchableOpacity>
    </View>
  );
}

const langStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginRight: 12,
    gap: 4,
  },
  active: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.primary || '#E50914',
    borderRadius: 4,
    overflow: 'hidden',
  },
  inactive: {
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: '#FFFFFF',
        headerRight: () => <LanguageSelector />,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: 'Movies',
          tabBarIcon: ({ color, size }) => <Film color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tv"
        options={{
          title: 'TV Shows',
          tabBarIcon: ({ color, size }) => <Tv color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="anime"
        options={{
          title: 'Anime',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
