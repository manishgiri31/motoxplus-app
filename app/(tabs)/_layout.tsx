import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { CartTabIcon } from '@/components/CartTabIcon';
import { HapticTab } from '@/components/haptic-tab';
import { NavBarBackground } from '@/src/components/ui/NavBarBackground';
import { colors, fonts } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        // Nav links are 12px; active goes to pure black, inactive stays secondary grey.
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.body.medium, fontSize: 12, letterSpacing: -0.12 },
        tabBarBackground: () => <NavBarBackground />,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: colors.lineSoft,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        // Each tab mounts only on first visit, and its screen tree is frozen
        // (no re-renders, paused effects) while another tab is focused —
        // avoids five tabs' worth of queries/state updates running at once.
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => <CartTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Feather name="package" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
