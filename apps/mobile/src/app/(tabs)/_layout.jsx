import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Compass, Download, User, Globe } from 'lucide-react-native';
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
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#e50914',
          tabBarInactiveTintColor: '#b3b3b3',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
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
          name="downloads"
          options={{
            title: t('nav.downloads'),
            tabBarIcon: ({ color, size }) => <Download color={color} size={size} />,
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
