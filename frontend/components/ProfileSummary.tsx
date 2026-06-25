import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

type ProfileSummaryProps = {
  displayName: string;
  avatarUrl: string;
  elo: number;
  rankLabel: string;
  winRate: string;
  streak: string;
  bio: string;
};

export function ProfileSummary({ displayName, avatarUrl, elo, rankLabel, winRate, streak, bio }: ProfileSummaryProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      <View style={styles.textBlock}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.label}>{rankLabel}</Text>
        <Text style={styles.bio}>{bio}</Text>
      </View>
      <View style={styles.statsRow}>
        <Stat label="Elo" value={String(elo)} />
        <Stat label="Win rate" value={winRate} />
        <Stat label="Streak" value={streak} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderColor: colors.border,
    borderWidth: 1,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 999,
    alignSelf: "center",
  },
  textBlock: {
    gap: 6,
  },
  name: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  bio: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  stat: {
    flexGrow: 1,
    minWidth: 88,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
});
