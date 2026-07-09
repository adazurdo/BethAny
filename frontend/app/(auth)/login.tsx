import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../components/AuthContext";
import { colors, radii, spacing } from "../../theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <Text style={styles.title}>Iniciar sesión</Text>
      <Text style={styles.subtitle}>Usa tu cuenta local para recuperar tu perfil y tus datos guardados.</Text>

      <View style={styles.identityHint}>
        <Text style={styles.identityHintLabel}>Puedes entrar con</Text>
        <Text style={styles.identityHintValue}>correo o usuario registrados</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          placeholder="Email o usuario"
          placeholderTextColor={colors.muted}
          value={identifier}
          onChangeText={setIdentifier}
          style={styles.input}
        />
        <TextInput
          secureTextEntry
          placeholder="Contraseña"
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={handleLogin} style={styles.button} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.buttonText}>Entrar</Text>}
        </Pressable>
      </View>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Volver</Text>
      </Pressable>
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
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
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
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: colors.surface,
    fontWeight: "900",
  },
  error: {
    color: colors.danger,
    fontWeight: "700",
  },
  back: {
    color: colors.primary,
    fontWeight: "800",
    textAlign: "center",
  },
});
