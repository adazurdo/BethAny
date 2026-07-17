import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type BethsIconProps = {
  size?: number;
  color?: string;
};

// Custom token mark for the Beths currency: a coin badge with a "B" glyph, so it reads as
// a distinct in-game token rather than the generic cash/euro iconography used elsewhere.
export function BethsIcon({ size = 18, color = colors.warning }: BethsIconProps) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
      <Text style={[styles.glyph, { fontSize: Math.round(size * 0.55), color }]}>B</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    fontWeight: "900",
  },
});

export default BethsIcon;
