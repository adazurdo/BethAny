import { Image, StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { Tappable } from "./Tappable";
import { accentForKey, colors, spacing } from "../theme";

type FriendRowProps = {
  accountId: string;
  displayName: string;
  avatarUrl: string;
  elo: number;
  challengeWins: number;
  challengeLosses: number;
  onRemove: () => void;
  onPress: () => void;
};

export function FriendRow({
  accountId,
  displayName,
  avatarUrl,
  elo,
  challengeWins,
  challengeLosses,
  onRemove,
  onPress,
}: FriendRowProps) {
  const accent = accentForKey(accountId);
  const hasRecord = challengeWins + challengeLosses > 0;

  return (
    <View style={styles.row}>
      <Tappable onPress={onPress} style={styles.identity}>
        <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: accent }]} />
        <View style={styles.details}>
          <Text style={styles.name}>{displayName}</Text>
          <View style={styles.metaRow}>
            <Icon glyph="elo" size={12} color={colors.gold} />
            <Text style={styles.meta}>{elo}</Text>
            {hasRecord ? (
              <>
                <Icon glyph="swords" size={12} color={colors.accent} />
                <Text style={styles.meta}>
                  {challengeWins}-{challengeLosses}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Tappable>
      <Tappable onPress={onRemove} style={styles.button}>
        <Icon glyph="remove" size={13} color={colors.danger} />
        <Text style={styles.buttonText}>Eliminar</Text>
      </Tappable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 2,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "700",
    marginRight: 6,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 13,
  },
});
