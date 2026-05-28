import { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, Compass, Heart, User, Globe, Search } from 'lucide-react-native';
import { colors } from '../../theme';
import { useTranslation } from '../../i18n';
import LanguageModal from '../../components/LanguageModal';

const ACTIVE_COLOR = colors.primary;
const INACTIVE_COLOR = '#7a7a7a';
const TAB_BG = '#0E0E0E';

// Telegram-style tab item: icon swaps to filled variant on active state,
// label is always visible and gets slightly heavier on active.
function makeTabIcon(IconComponent) {
  return function TabIcon({ focused, size }) {
    const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
    return (
      <IconComponent
        color={color}
        size={size}
        fill={focused ? color : 'transparent'}
        strokeWidth={focused ? 2 : 1.8}
      />
    );
  };
}

function makeTabLabel(label) {
  return function TabLabel({ focused }) {
    return (
      <Text
        style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    );
  };
}

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const [langModalVisible, setLangModalVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: '#FFFFFF',
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => router.push('/search')}
                style={styles.headerButton}
                accessibilityLabel={t('nav.search')}
              >
                <Search color="#FFFFFF" size={22} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLangModalVisible(true)}
                style={styles.headerButton}
                accessibilityLabel={t('profile.language')}
              >
                <Globe color="#FFFFFF" size={22} />
              </TouchableOpacity>
            </View>
          ),
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: TAB_BG,
            borderTopWidth: 0,
            height: 60,
            paddingBottom: 6,
            paddingTop: 6,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarItemStyle: {
            paddingVertical: 2,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('nav.home'),
            tabBarIcon: makeTabIcon(Home),
            tabBarLabel: makeTabLabel(t('nav.home')),
          }}
        />
        <Tabs.Screen
          name="browse"
          options={{
            title: t('nav.browse'),
            tabBarIcon: makeTabIcon(Compass),
            tabBarLabel: makeTabLabel(t('nav.browse')),
          }}
        />
        <Tabs.Screen
          name="mylist"
          options={{
            title: t('nav.myList'),
            tabBarIcon: makeTabIcon(Heart),
            tabBarLabel: makeTabLabel(t('nav.myList')),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('nav.profile'),
            tabBarIcon: makeTabIcon(User),
            tabBarLabel: makeTabLabel(t('nav.profile')),
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

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  headerButton: {
    padding: 6,
    marginLeft: 4,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
  labelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },
  labelInactive: {
    color: INACTIVE_COLOR,
    fontWeight: '500',
  },
});
