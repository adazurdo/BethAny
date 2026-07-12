import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

export type FriendSortOption = "eloDesc" | "eloAsc" | "alpha";

const OPTIONS: { value: FriendSortOption; label: string }[] = [
  { value: "eloDesc", label: "Elo ↓" },
  { value: "eloAsc", label: "Elo ↑" },
  { value: "alpha", label: "A-Z" },
];

type FriendSortControlProps = {
  value: FriendSortOption;
  onChange: (value: FriendSortOption) => void;
};

export function FriendSortControl({ value, onChange }: FriendSortControlProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active ? styles.chipActive : undefined]}
          >
            <Text style={[styles.chipText, active ? styles.chipTextActive : undefined]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.background,
  },
});
