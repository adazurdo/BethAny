import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { Icon } from "./Icon";
import { Tappable } from "./Tappable";
import { colors, radii, shadows, spacing } from "../theme";

type DeleteAccountModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
};

export function DeleteAccountModal({ visible, onClose, onConfirm }: DeleteAccountModalProps) {
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPassword("");
      setError(null);
    }
  }, [visible]);

  function handleClose() {
    if (deleting) return;
    onClose();
  }

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta.");
      setDeleting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Icon glyph="trash" size={20} color={colors.danger} />
            <Text style={styles.title}>Eliminar cuenta</Text>
          </View>

          <Text style={styles.warning}>
            Esta acción es permanente: se borran tu perfil, apuestas, retos y grupos. No se puede deshacer.
          </Text>

          <Text style={styles.fieldLabel}>Confirmá tu contraseña</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor={colors.muted}
            style={styles.input}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => handleConfirm()}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Tappable onPress={handleClose} style={styles.cancelButton} disabled={deleting}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Tappable>
            <Tappable onPress={handleConfirm} style={styles.confirmButton} disabled={deleting || !password}>
              {deleting ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Icon glyph="trash" size={15} color={colors.background} />
                  <Text style={styles.confirmText}>Eliminar cuenta</Text>
                </>
              )}
            </Tappable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(4,10,32,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.danger,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
    shadowColor: colors.danger,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  warning: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldLabel: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  cancelText: {
    color: colors.muted,
    fontWeight: "700",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    shadowColor: colors.danger,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
  },
  confirmText: {
    color: colors.background,
    fontWeight: "800",
  },
});
