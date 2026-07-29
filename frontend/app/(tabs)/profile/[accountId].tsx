import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { EloTierBadge } from "../../../components/EloTierBadge";
import { Icon } from "../../../components/Icon";
import { SectionCard } from "../../../components/SectionCard";
import { Tappable } from "../../../components/Tappable";
import { fetchAccountProfile, AccountProfile } from "../../../data/profile";
import { sendFriendRequest } from "../../../data/social";
import { accentForKey, colors, radii, spacing } from "../../../theme";

export default function AccountProfileScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    setProfile(null);
    setError(null);
    fetchAccountProfile(accountId)
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el perfil.");
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  async function handleSendRequest() {
    if (!profile) return;
    setSending(true);
    setError(null);
    try {
      await sendFriendRequest(profile.identifier);
      setProfile({ ...profile, relationship: "outgoing" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud.");
    } finally {
      setSending(false);
    }
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const accent = accentForKey(profile.accountId);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={{ uri: profile.avatarUrl }} style={[styles.avatar, { borderColor: accent }]} />
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.rankLabel}>{profile.rankLabel}</Text>
        <EloTierBadge elo={profile.elo} />
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {profile.relationship === "friend" ? (
          <View style={styles.relationshipTag}>
            <Icon glyph="check" size={13} color={colors.success} />
            <Text style={[styles.relationshipTagText, { color: colors.success }]}>Ya sois amigos</Text>
          </View>
        ) : profile.relationship === "outgoing" ? (
          <View style={styles.relationshipTag}>
            <Icon glyph="clock" size={13} color={colors.muted} />
            <Text style={styles.relationshipTagText}>Solicitud pendiente</Text>
          </View>
        ) : profile.relationship === "incoming" ? (
          <Tappable style={styles.relationshipTag} onPress={() => router.push("/social")}>
            <Icon glyph="info" size={13} color={colors.accent} />
            <Text style={[styles.relationshipTagText, { color: colors.accent }]}>Te ha escrito · ir a Social</Text>
          </Tappable>
        ) : profile.relationship === "none" ? (
          <Tappable style={styles.addFriendButton} onPress={handleSendRequest} disabled={sending}>
            <Icon glyph="send" size={14} color={colors.background} />
            <Text style={styles.addFriendButtonText}>{sending ? "Enviando..." : "Enviar solicitud"}</Text>
          </Tappable>
        ) : null}

        {error && profile.relationship === "none" ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <SectionCard title="Estadísticas" icon="target" accentColor={colors.sky}>
        <StatRow label="Racha actual" value={profile.streak} />
        <StatRow label="Aciertos" value={profile.winRate} isLast />
      </SectionCard>

      {profile.relationship === "friend" ? (
        <SectionCard title="Cara a cara" subtitle="Retos entre vosotros" icon="swords" accentColor={colors.pink}>
          <View style={styles.h2hRow}>
            <View style={styles.h2hStat}>
              <Text style={styles.h2hValue}>{profile.headToHead.wins}</Text>
              <Text style={styles.h2hLabel}>Ganados</Text>
            </View>
            <View style={styles.h2hDivider} />
            <View style={styles.h2hStat}>
              <Text style={styles.h2hValue}>{profile.headToHead.losses}</Text>
              <Text style={styles.h2hLabel}>Perdidos</Text>
            </View>
          </View>
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

function StatRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.statRow, isLast ? styles.statRowLast : null]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  content: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  hero: {
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 999,
    borderWidth: 2,
    marginBottom: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  rankLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  bio: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  relationshipTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  relationshipTagText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 12,
  },
  addFriendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    marginTop: spacing.sm,
  },
  addFriendButtonText: {
    color: colors.background,
    fontWeight: "900",
    fontSize: 13,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
  statLabel: {
    color: colors.muted,
  },
  statValue: {
    color: colors.text,
    fontWeight: "800",
  },
  h2hRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  h2hStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  h2hValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  h2hLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  h2hDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
});
