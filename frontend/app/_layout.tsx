import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors } from "../theme";
import { BetSlipProvider } from "../components/BetSlipContext";
import { AuthProvider } from "../components/AuthContext";
import { HeaderAvatar } from "../components/HeaderAvatar";

const contentHeaderOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.background },
  headerTitleStyle: { color: colors.text, fontWeight: "900" as const },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  headerRight: () => <HeaderAvatar />,
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AuthProvider>
        <BetSlipProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="ranking/index" options={{ title: "Ranking", ...contentHeaderOptions }} />
            <Stack.Screen name="matches/index" options={{ title: "Partidos", ...contentHeaderOptions }} />
          </Stack>
        </BetSlipProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
