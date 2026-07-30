import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { ELO_TIERS, tierProgress, withAlpha } from "../data/eloTiers";
import { colors, radii, shadows, spacing, fontSizes } from "../theme";

type EloTierListModalProps = {
  visible: boolean;
  onClose: () => void;
  // Highlights the caller's own tier row; omitted when browsing someone else's badge.
  elo?: number;
};

export function EloTierListModal({ visible, onClose, elo }: EloTierListModalProps) {
  const progress = elo !== undefined ? tierProgress(elo) : null;
  const currentTierName = progress?.tier.name ?? null;
  const nextTier = progress?.nextTier ?? null;
  const eloToNextTier = progress?.eloToNext ?? null;
  // Highest tier first reads like a ladder to climb, matching how the badge itself is framed.
  const orderedTiers = [...ELO_TIERS].reverse();

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Categorías por Elo</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon glyph="closeOutline" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Cada categoría requiere 100 de Elo más que la anterior.</Text>

          {elo !== undefined ? (
            <View style={styles.progressBanner}>
              <Text style={styles.progressText}>
                {nextTier ? `Faltan ${eloToNextTier} Elo para ${nextTier.emoji} ${nextTier.name}` : "Categoría máxima alcanzada 👑"}
              </Text>
            </View>
          ) : null}

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {orderedTiers.map((tier) => {
              const isCurrent = tier.name === currentTierName;
              return (
                <View
                  key={tier.name}
                  style={[styles.row, { backgroundColor: withAlpha(tier.color, "1A") }, isCurrent ? styles.rowCurrent : null]}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.tierEmoji}>{tier.emoji}</Text>
                    <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
                  </View>
                  <Text style={styles.tierThreshold}>{tier.minElo}+ Elo</Text>
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "80%",
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    fontSize: fontSizes.lg,
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  progressBanner: {
    backgroundColor: withAlpha(colors.primary, "22"),
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginBottom: spacing.sm,
  },
  progressText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: fontSizes.sm,
    textAlign: "center",
  },
  list: {
    marginTop: spacing.xs,
  },
  listContent: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowCurrent: {
    borderColor: colors.primary,
    ...shadows.selected,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierEmoji: {
    fontSize: 18,
  },
  tierName: {
    fontWeight: "800",
    fontSize: fontSizes.md,
  },
  tierThreshold: {
    color: colors.text,
    fontWeight: "700",
    fontSize: fontSizes.sm,
  },
});
