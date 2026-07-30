import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors } from "../theme";
import { BetSlipProvider } from "../components/BetSlipContext";
import { AuthProvider } from "../components/AuthContext";
import { SocialNotificationsProvider } from "../components/SocialNotificationsContext";
import { StreakProvider } from "../components/StreakContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AuthProvider>
        <SocialNotificationsProvider>
          <BetSlipProvider>
            <StreakProvider>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </StreakProvider>
          </BetSlipProvider>
        </SocialNotificationsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
