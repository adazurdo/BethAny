import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import { colors } from "../theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontWeight: "700",
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarLabel: "Home", tabBarIcon: () => <Text>🏠</Text> }} />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: () => <Text>👤</Text> }} />
        <Tabs.Screen name="social" options={{ title: "Social", tabBarLabel: "Social", tabBarIcon: () => <Text>👥</Text> }} />
      </Tabs>
    </>
  );
}
