import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { colors } from "../theme";
import { useAuth } from "./AuthContext";
import { BETH_INCOME_INTERVAL_SECONDS, formatCountdown, secondsUntilNextBeth } from "../data/economy";

type BethsCountdownProps = {
  color?: string;
};

export function BethsCountdown({ color = colors.muted }: BethsCountdownProps) {
  const { account, refreshAccount } = useAuth();
  const lastGrantAt = account?.profile.bethsLastGrantAt ?? "";
  const [remaining, setRemaining] = useState(() => secondsUntilNextBeth(lastGrantAt));

  useEffect(() => {
    setRemaining(secondsUntilNextBeth(lastGrantAt));
  }, [lastGrantAt]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // A Beth just became due server-side; pull the fresh balance and grant timestamp.
          void refreshAccount();
          return BETH_INCOME_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshAccount]);

  if (!account) return null;

  return <Text style={[styles.text, { color }]}>+1 Beth en {formatCountdown(remaining)}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
});

export default BethsCountdown;
