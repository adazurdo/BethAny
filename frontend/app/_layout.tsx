import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import Icon from "../components/Icon";
import { colors } from "../theme";
import { BetSlipProvider } from "../components/BetSlipContext";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <BetSlipProvider>
        <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
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
        <Tabs.Screen name="index" options={{ title: "Home", tabBarLabel: "Home", tabBarIcon: () => <Icon glyph="🏠" /> }} />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: () => <Icon glyph="👤" /> }} />
        <Tabs.Screen name="social" options={{ title: "Social", tabBarLabel: "Social", tabBarIcon: () => <Icon glyph="👥" /> }} />
      </Tabs>
      </BetSlipProvider>
    </>
  );
}
