import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Compass, Heart, User, Globe } from 'lucide-react-native';
import { colors } from '../../theme';
import { useTranslation } from '../../i18n';
import LanguageModal from '../../components/LanguageModal';

export default function TabLayout() {
  const { t } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: '#FFFFFF',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setLangModalVisible(true)}
              style={{ marginRight: 12, padding: 4 }}
            >
              <Globe color="#FFFFFF" size={22} />
            </TouchableOpacity>
          ),
          tabBarStyle: {
            backgroundColor: '#000000',
            borderTopWidth: 0,
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
            elevation: 12,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          },
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#5a5a5a',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarIconStyle: {
            marginBottom: 0,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('nav.home'),
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="browse"
          options={{
            title: t('nav.browse'),
            tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="mylist"
          options={{
            title: t('nav.myList'),
            tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('nav.profile'),
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
      </Tabs>
      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </>
  );
}
