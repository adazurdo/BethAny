import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { Tappable } from "./Tappable";
import { colors, radii, shadows, spacing } from "../theme";
import { FriendChallenge } from "../data/challenges";

const OUTCOME_LABELS: Record<string, string> = {
  local: "Local",
  empate: "Empate",
  visitante: "Visitante",
};

function pickLabel(challenge: FriendChallenge, value: string) {
  return challenge.challengeType === "match" ? OUTCOME_LABELS[value] ?? value : value;
}

type ChallengeRowProps = {
  challenge: FriendChallenge;
  myAccountId: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  onResolve?: (result: string) => void;
};

export function ChallengeRow({ challenge, myAccountId, onAccept, onDecline, onCancel, onResolve }: ChallengeRowProps) {
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  const iAmChallenger = challenge.challengerAccountId === myAccountId;
  const otherDisplayName = iAmChallenger ? challenge.opponentDisplayName : challenge.challengerDisplayName;
  const title = challenge.challengeType === "match" ? challenge.matchLabel : challenge.title;

  const isDead = challenge.status === "cancelled" || challenge.status === "declined";

  let statusLabel: string;
  let statusColor = colors.muted;
  let statusIcon = "clock";
  if (challenge.status === "pending") {
    statusLabel = iAmChallenger ? "Esperando respuesta" : "Te reta";
    statusIcon = "clock";
    statusColor = colors.gold;
  } else if (challenge.status === "accepted") {
    statusLabel = "En curso";
    statusIcon = "fire";
    statusColor = colors.sky;
  } else if (challenge.status === "declined") {
    statusLabel = "Rechazado";
    statusIcon = "closeOutline";
    statusColor = colors.danger;
  } else if (challenge.status === "cancelled") {
    statusLabel = "Cancelado";
    statusIcon = "cancel";
    statusColor = colors.danger;
  } else {
    const won = challenge.winnerAccountId === myAccountId;
    statusLabel = won ? "Ganado" : "Perdido";
    statusIcon = won ? "medal" : "closeOutline";
    statusColor = won ? colors.success : colors.danger;
  }

  const canResolve = Boolean(onResolve) && challenge.challengeType === "custom" && challenge.status === "accepted";

  return (
    <View style={[styles.card, { borderBottomColor: statusColor }, isDead ? styles.cardCancelled : null]}>
      <View style={styles.header}>
        <View style={styles.opponentRow}>
          <Icon glyph={challenge.challengeType === "match" ? "matches" : "sparkles"} size={14} color={colors.accent} />
          <Text style={styles.opponent}>{iAmChallenger ? `Retaste a ${otherDisplayName}` : `${otherDisplayName} te reta`}</Text>
        </View>
        <View style={styles.statusPill}>
          <Icon glyph={statusIcon} size={13} color={statusColor} />
          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.matchLabel} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.pick}>
        {iAmChallenger
          ? `Tu apuesta: ${pickLabel(challenge, challenge.outcome)}`
          : `Reto a que no acierta: ${pickLabel(challenge, challenge.outcome)}`}
      </Text>

      {challenge.status === "settled" ? (
        <Text style={styles.resultText}>Resultado: {pickLabel(challenge, challenge.result ?? "")}</Text>
      ) : null}

      {onAccept || onDecline ? (
        <View style={styles.actions}>
          {onAccept ? (
            <Tappable style={styles.acceptButton} onPress={onAccept}>
              <Icon glyph="check" size={14} color={colors.background} />
              <Text style={styles.acceptButtonText}>Aceptar</Text>
            </Tappable>
          ) : null}
          {onDecline ? (
            <Tappable style={styles.rejectButton} onPress={onDecline}>
              <Icon glyph="close" size={14} color={colors.danger} />
              <Text style={styles.rejectButtonText}>Rechazar</Text>
            </Tappable>
          ) : null}
        </View>
      ) : null}

      {onCancel ? (
        <Tappable style={styles.cancelButton} onPress={onCancel}>
          <Icon glyph="cancel" size={13} color={colors.danger} />
          <Text style={styles.cancelButtonText}>Cancelar reto</Text>
        </Tappable>
      ) : null}

      {canResolve ? (
        <View style={styles.resolveBlock}>
          <Text style={styles.resolveLabel}>¿Cual fue el resultado?</Text>
          <View style={styles.pillRow}>
            {challenge.options.map((option) => {
              const isSelected = selectedResult === option;
              return (
                <Tappable
                  key={option}
                  onPress={() => setSelectedResult(option)}
                  style={[styles.resolvePill, isSelected ? styles.resolvePillActive : null]}
                >
                  {isSelected ? <Icon glyph="check" size={13} color={colors.background} /> : null}
                  <Text style={[styles.resolvePillText, isSelected ? styles.resolvePillTextActive : null]}>{option}</Text>
                </Tappable>
              );
            })}
          </View>
          <Tappable
            style={[styles.confirmResolveButton, !selectedResult ? styles.confirmResolveButtonDisabled : null]}
            disabled={!selectedResult}
            onPress={() => selectedResult && onResolve?.(selectedResult)}
          >
            <Text style={styles.confirmResolveText}>Confirmar resultado</Text>
          </Tappable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  cardCancelled: {
    borderBottomColor: colors.danger,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  opponentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  opponent: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 14,
    flex: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  status: {
    fontWeight: "800",
    fontSize: 12,
  },
  matchLabel: {
    color: colors.text,
    fontSize: 13,
  },
  pick: {
    color: colors.muted,
    fontSize: 12,
  },
  resultText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  acceptButtonText: {
    color: colors.background,
    fontWeight: "800",
    fontSize: 12,
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  rejectButtonText: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 12,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginTop: spacing.xs,
  },
  cancelButtonText: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 12,
  },
  resolveBlock: {
    marginTop: spacing.xs,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  resolveLabel: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  resolvePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  resolvePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.selected,
  },
  resolvePillText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  resolvePillTextActive: {
    color: colors.background,
  },
  confirmResolveButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  confirmResolveButtonDisabled: {
    opacity: 0.5,
  },
  confirmResolveText: {
    color: colors.background,
    fontWeight: "800",
    fontSize: 12,
  },
});
