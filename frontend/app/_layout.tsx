import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../theme";
import { BetSlipProvider } from "../components/BetSlipContext";
import { AuthProvider } from "../components/AuthContext";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <AuthProvider>
        <BetSlipProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="ranking/index" options={{ title: "Ranking" }} />
          </Stack>
        </BetSlipProvider>
      </AuthProvider>
    </>
  );
}
