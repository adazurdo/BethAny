import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../components/AuthContext";
import { Icon } from "../../components/Icon";
import { Tappable } from "../../components/Tappable";
import { colors, radii, shadows, spacing } from "../../theme";

// A code is always sent the moment this screen becomes reachable (on register/login), so the
// resend cooldown starts pre-armed at the full 60s rather than at 0 — matches the backend's
// VERIFICATION_RESEND_COOLDOWN_SECONDS (account_repository.py) without needing to expose the
// exact `verification_code_sent_at` timestamp to the client.
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { account, verifyEmail, resendVerification, logout } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleVerify() {
    setError(null);
    if (code.trim().length !== 6) {
      setError("Introduce el código de 6 dígitos que enviamos a tu correo.");
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(code.trim());
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo verificar el código.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResendMessage(null);
    setResendLoading(true);
    try {
      await resendVerification();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setResendMessage("Código reenviado. Revisa tu correo.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo reenviar el código.";
      setError(message);
      // Resync with the backend's own cooldown if our local timer drifted (e.g. after
      // navigating away and back): its 409 message already carries the exact remainder.
      const match = message.match(/(\d+)s/);
      if (match) setCooldown(Number(match[1]));
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.iconBadge}>
        <Icon glyph="shield" size={26} color={colors.sky} />
      </View>
      <Text style={styles.title}>Verifica tu correo</Text>
      <Text style={styles.subtitle}>
        Enviamos un código de 6 dígitos a {account?.identifier ?? "tu correo"}. Introdúcelo para desbloquear apostar y
        retar a tus amigos.
      </Text>

      <View style={styles.form}>
        <View style={styles.inputRow}>
          <Icon glyph="mail" size={16} color={colors.muted} />
          <TextInput
            ref={codeRef}
            autoCapitalize="none"
            keyboardType="number-pad"
            maxLength={6}
            placeholder="Código de 6 dígitos"
            placeholderTextColor={colors.muted}
            value={code}
            onChangeText={setCode}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={() => handleVerify()}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {resendMessage ? <Text style={styles.success}>{resendMessage}</Text> : null}
        <Tappable onPress={handleVerify} style={styles.button} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Icon glyph="check" size={16} color={colors.background} />
              <Text style={styles.buttonText}>Verificar</Text>
            </>
          )}
        </Tappable>
        <Tappable onPress={handleResend} style={styles.resendButton} disabled={resendLoading || cooldown > 0}>
          {resendLoading ? (
            <ActivityIndicator color={colors.sky} />
          ) : (
            <>
              <Icon glyph="send" size={14} color={colors.sky} />
              <Text style={styles.resendButtonText}>
                {cooldown > 0 ? `Reenviar código (${cooldown}s)` : "Reenviar código"}
              </Text>
            </>
          )}
        </Tappable>
      </View>

      <Tappable onPress={() => router.replace("/(tabs)")} style={styles.backButton}>
        <Text style={styles.back}>
          Seguir explorando sin verificar (podrás apostar y retar en cuanto verifiques)
        </Text>
      </Tappable>

      <Tappable onPress={() => logout()} style={styles.backButton}>
        <Icon glyph="back" size={14} color={colors.primary} />
        <Text style={styles.back}>Cerrar sesión</Text>
      </Tappable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.sky,
    backgroundColor: `${colors.sky}26`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 22,
  },
  form: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: spacing.xs,
    color: colors.text,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.xs,
    backgroundColor: colors.sky,
    borderRadius: 999,
    paddingVertical: 12,
    shadowColor: colors.sky,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: colors.background,
    fontWeight: "900",
  },
  error: {
    color: colors.danger,
    fontWeight: "700",
  },
  success: {
    color: colors.sky,
    fontWeight: "700",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resendButtonText: {
    color: colors.sky,
    fontWeight: "800",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  back: {
    color: colors.primary,
    fontWeight: "800",
    textAlign: "center",
  },
});
