import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { EconomyBadges } from "./EconomyBadges";
import { colors, radii, spacing } from "../theme";

type ProfileSummaryProps = {
  displayName: string;
  identifier?: string;
  avatarUrl: string;
  elo: number;
  coins: number;
  rankLabel: string;
  winRate: string;
  streak: string;
  bio: string;
  onChangeAvatar?: () => void;
  changingAvatar?: boolean;
};

// Elo and coins are the two numbers this feature (006-elo) most wants a user to notice at a
// glance, so they get their own prominent EconomyBadges row instead of blending into the
// small secondary stat row below (win rate / streak).

export function ProfileSummary({
  displayName,
  identifier,
  avatarUrl,
  elo,
  coins,
  rankLabel,
  winRate,
  streak,
  bio,
  onChangeAvatar,
  changingAvatar,
}: ProfileSummaryProps) {
  const identifierLabel = identifier ? (identifier.includes("@") ? "Correo de acceso" : "Usuario de acceso") : "Cuenta";

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        {onChangeAvatar ? (
          <Pressable style={styles.avatarEditButton} onPress={onChangeAvatar} disabled={changingAvatar}>
            {changingAvatar ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.avatarEditText}>Cambiar foto</Text>
            )}
          </Pressable>
        ) : null}
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.name}>{displayName}</Text>
        {identifier ? (
          <View style={styles.identityBadge}>
            <Text style={styles.identityBadgeLabel}>{identifierLabel}</Text>
            <Text style={styles.identityBadgeValue} numberOfLines={1}>
              {identifier}
            </Text>
          </View>
        ) : null}
        <Text style={styles.label}>{rankLabel}</Text>
        <Text style={styles.bio}>{bio}</Text>
      </View>
      <EconomyBadges elo={elo} coins={coins} size="lg" />
      <View style={styles.statsRow}>
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
  avatarWrap: {
    alignItems: "center",
    gap: spacing.xs,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 999,
  },
  avatarEditButton: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minWidth: 96,
    alignItems: "center",
  },
  avatarEditText: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: 12,
  },
  textBlock: {
    gap: 6,
  },
  name: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
  },
  identityBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  identityBadgeLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  identityBadgeValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
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
