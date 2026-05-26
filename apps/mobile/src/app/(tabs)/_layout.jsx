import { Tabs } from 'expo-router';
import { Home, Film, Tv, Search } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#374151',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
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
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
