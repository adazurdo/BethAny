import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../components/AuthContext";
import { Icon } from "../../components/Icon";
import { Tappable } from "../../components/Tappable";
import { colors, radii, shadows, spacing } from "../../theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const displayNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

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
      <View style={styles.iconBadge}>
        <Icon glyph="personAdd" size={26} color={colors.pink} />
      </View>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Registra una identidad local para guardar tu progreso en SQLite.</Text>

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
            onSubmitEditing={() => displayNameRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        <View style={styles.inputRow}>
          <Icon glyph="profile" size={16} color={colors.muted} />
          <TextInput
            ref={displayNameRef}
            autoCapitalize="words"
            placeholder="Nombre visible"
            placeholderTextColor={colors.muted}
            value={displayName}
            onChangeText={setDisplayName}
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
            onSubmitEditing={() => handleRegister()}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Tappable onPress={handleRegister} style={styles.button} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Icon glyph="personAdd" size={16} color={colors.background} />
              <Text style={styles.buttonText}>Registrarme</Text>
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
    borderColor: colors.pink,
    backgroundColor: `${colors.pink}26`,
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
    backgroundColor: colors.pink,
    borderRadius: 999,
    paddingVertical: 12,
    shadowColor: colors.pink,
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
