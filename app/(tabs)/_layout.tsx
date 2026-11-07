import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { CartTabIcon } from '@/components/CartTabIcon';
import { HapticTab } from '@/components/haptic-tab';
import { House } from '@/components/icons/House';
import { LayoutGrid } from '@/components/icons/LayoutGrid';
import { Package } from '@/components/icons/Package';
import { UserRound } from '@/components/icons/UserRound';
import { iconSizes, iconStroke } from '@/components/icons/iconSizes';
import { NavBarBackground } from '@/src/components/ui/NavBarBackground';
import { colors, fonts } from '@/src/theme';

// iOS: translucent white + blur. Web: CSS backdrop blur (both via NavBarBackground).
// Android: solid white — expo-blur isn't stable there in SDK 54.
function TabBarBackground() {
  if (Platform.OS === 'android') {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.white }]} />;
  }
  return <NavBarBackground />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        // Selected = accent, unselected = ink3. These tints also colour the labels
        // and are the `color` handed to each tabBarIcon below.
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.ink3,
        // React Navigation sizes its 49pt bar for a 28pt icon box and a 10pt
        // label. With our 12pt Inter label that overflowed by ~4pt: clipped
        // on web, pressed against the bottom edge on phones. Fit the box to
        // the 24pt icon and pin the label's line height so 5 + 24 + 14 + 5
        // fits the bar without changing its height.
        tabBarLabelStyle: { fontFamily: fonts.body.medium, fontSize: 12, lineHeight: 14, letterSpacing: -0.12 },
        tabBarIconStyle: { height: iconSizes.tabBar },
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: colors.line,
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
          tabBarIcon: ({ color, focused }) => (
            <House size={iconSizes.tabBar} color={color} strokeWidth={focused ? iconStroke.selected : iconStroke.default} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, focused }) => (
            <LayoutGrid size={iconSizes.tabBar} color={color} strokeWidth={focused ? iconStroke.selected : iconStroke.default} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => <CartTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <Package size={iconSizes.tabBar} color={color} strokeWidth={focused ? iconStroke.selected : iconStroke.default} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <UserRound size={iconSizes.tabBar} color={color} strokeWidth={focused ? iconStroke.selected : iconStroke.default} />
          ),
        }}
      />
    </Tabs>
  );
}
