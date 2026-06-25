import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

type GroupCardProps = {
  name: string;
  memberCount: number;
  ownerName: string;
  lastActivityLabel: string;
  score: number;
};

export function GroupCard({ name, memberCount, ownerName, lastActivityLabel, score }: GroupCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.score}>{score} pts</Text>
      </View>
      <Text style={styles.meta}>{memberCount} members · Owned by {ownerName}</Text>
      <Text style={styles.activity}>{lastActivityLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  score: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  activity: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
