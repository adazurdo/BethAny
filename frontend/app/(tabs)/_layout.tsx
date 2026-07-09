import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useAuth } from "../../components/AuthContext";
import Icon from "../../components/Icon";
import { colors } from "../../theme";

export default function TabsLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarIconStyle: styles.iconWrap,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => <Icon glyph="home" color={color as string} size={20} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => <Icon glyph="profile" color={color as string} size={20} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Social",
          tabBarLabel: "Social",
          tabBarIcon: ({ color, focused }) => <Icon glyph="social" color={color as string} size={20} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 72,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 10,
  },
  tabItem: {
    borderRadius: 18,
    marginHorizontal: 4,
  },
  iconWrap: {
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
});
