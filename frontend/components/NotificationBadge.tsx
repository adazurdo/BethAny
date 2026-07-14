import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type NotificationBadgeProps = {
  inline?: boolean;
};

export function NotificationBadge({ inline = false }: NotificationBadgeProps) {
  return (
    <View style={inline ? styles.badgeInline : styles.badgeFloating}>
      <Text style={styles.text}>!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeFloating: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  badgeInline: {
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  text: {
    color: colors.background,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },
});
