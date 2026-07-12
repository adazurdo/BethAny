import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing } from "../theme";

type CreateGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
};

export function CreateGroupModal({ visible, onClose, onCreate }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setName("");
    setError(null);
    onClose();
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("El grupo necesita un nombre.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(name.trim());
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grupo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Nuevo grupo de predicciones</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del grupo"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleCreate} style={styles.createButton}>
              <Text style={styles.createText}>{submitting ? "Creando..." : "Crear"}</Text>
            </Pressable>
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
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.text,
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
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  createText: {
    color: colors.background,
    fontWeight: "800",
  },
});
