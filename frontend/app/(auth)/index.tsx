import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AuthChoice } from "../../components/AuthChoice";
import { Icon } from "../../components/Icon";
import { colors, spacing } from "../../theme";

export default function AuthEntryScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.kickerRow}>
          <Icon glyph="sparkles" size={16} color={colors.primary} />
          <Text style={styles.kicker}>BethAny</Text>
        </View>
        <Text style={styles.title}>Accede con tu cuenta local</Text>
        <Text style={styles.subtitle}>
          Regístrate o inicia sesión para recuperar tu perfil, tu elo, tus apuestas y tus amistades desde SQLite local.
        </Text>
      </View>

      <AuthChoice
        title="Crear cuenta"
        subtitle="Empieza desde cero con un identificador local y una contraseña."
        actionLabel="Registrarme"
        icon="personAdd"
        accentColor={colors.pink}
        onPress={() => router.push("/(auth)/register")}
      />

      <AuthChoice
        title="Iniciar sesión"
        subtitle="Vuelve a entrar con la misma cuenta para restaurar tu progreso."
        actionLabel="Entrar"
        icon="login"
        accentColor={colors.sky}
        onPress={() => router.push("/(auth)/login")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: "center",
  },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  kicker: {
    color: colors.primary,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
