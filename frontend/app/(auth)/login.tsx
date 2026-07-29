import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../components/AuthContext";
import { Icon } from "../../components/Icon";
import { Tappable } from "../../components/Tappable";
import { colors, radii, shadows, spacing } from "../../theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function handleLogin() {
    setError(null);
    if (!identifier.trim() || !password.trim()) {
      setError("Introduce tu usuario o email y tu contraseña.");
      return;
    }
    setLoading(true);
    try {
      await login({ identifier, password });
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.iconBadge}>
        <Icon glyph="login" size={26} color={colors.sky} />
      </View>
      <Text style={styles.title}>Iniciar sesión</Text>
      <Text style={styles.subtitle}>Usa tu cuenta local para recuperar tu perfil y tus datos guardados.</Text>

      <View style={styles.identityHint}>
        <Icon glyph="info" size={14} color={colors.sky} />
        <View>
          <Text style={styles.identityHintLabel}>Puedes entrar con</Text>
          <Text style={styles.identityHintValue}>correo o usuario registrados</Text>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.inputRow}>
          <Icon glyph="mail" size={16} color={colors.muted} />
          <TextInput
            autoCapitalize="none"
            placeholder="Email o usuario"
            placeholderTextColor={colors.muted}
            value={identifier}
            onChangeText={setIdentifier}
            style={styles.input}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        <View style={styles.inputRow}>
          <Icon glyph="lock" size={16} color={colors.muted} />
          <TextInput
            ref={passwordRef}
            secureTextEntry
            placeholder="Contraseña"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={() => handleLogin()}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Tappable onPress={handleLogin} style={styles.button} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Icon glyph="login" size={16} color={colors.background} />
              <Text style={styles.buttonText}>Entrar</Text>
            </>
          )}
        </Tappable>
      </View>

      <Tappable onPress={() => router.back()} style={styles.backButton}>
        <Icon glyph="back" size={14} color={colors.primary} />
        <Text style={styles.back}>Volver</Text>
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
  identityHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.sky,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  identityHintLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  identityHintValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
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
