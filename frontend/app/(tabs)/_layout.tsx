import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useAuth } from "../../components/AuthContext";
import { HeaderAvatar } from "../../components/HeaderAvatar";
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
        headerShown: true,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerRight: () => <HeaderAvatar />,
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
      <Tabs.Screen name="groups/[groupId]" options={{ href: null, title: "Grupo" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 76,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  tabItem: {
    borderRadius: 14,
    marginHorizontal: 4,
  },
  iconWrap: {
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
});
