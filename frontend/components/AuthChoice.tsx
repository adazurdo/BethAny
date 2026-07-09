import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

type Props = {
  title: string;
  subtitle: string;
  actionLabel: string;
  onPress: () => void;
};

export function AuthChoice({ title, subtitle, actionLabel, onPress }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Pressable onPress={onPress} style={styles.button}>
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: colors.surface,
    fontWeight: "900",
  },
});