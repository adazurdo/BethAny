import { Image, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthContext";
import { colors } from "../theme";

export function HeaderAvatar() {
  const router = useRouter();
  const { account } = useAuth();
  const avatarUrl = account?.profile.avatarUrl;

  if (!avatarUrl) {
    return null;
  }

  return (
    <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.wrap} hitSlop={8}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginRight: 16,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
});
