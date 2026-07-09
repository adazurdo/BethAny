import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../components/AuthContext";
import { colors, radii, spacing } from "../../theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);
    if (!identifier.trim() || !password.trim()) {
      setError("Introduce un email/usuario y una contraseña.");
      return;
    }
    setLoading(true);
    try {
      await register({ identifier, password, displayName: displayName.trim() || undefined });
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Registra una identidad local para guardar tu progreso en SQLite.</Text>

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
          autoCapitalize="words"
          placeholder="Nombre visible"
          placeholderTextColor={colors.muted}
          value={displayName}
          onChangeText={setDisplayName}
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
        <Pressable onPress={handleRegister} style={styles.button} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.buttonText}>Registrarme</Text>}
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
