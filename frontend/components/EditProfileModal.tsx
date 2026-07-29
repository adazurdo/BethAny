import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Icon } from "./Icon";
import { Tappable } from "./Tappable";
import { colors, radii, shadows, spacing } from "../theme";

type EditProfileModalProps = {
  visible: boolean;
  initialDisplayName: string;
  initialBio: string;
  onClose: () => void;
  onSave: (displayName: string, bio: string) => Promise<void>;
};

export function EditProfileModal({ visible, initialDisplayName, initialBio, onClose, onSave }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the draft to whatever the profile currently is every time the modal opens, so
  // reopening it never shows a stale edit left over from a previous cancel.
  useEffect(() => {
    if (visible) {
      setDisplayName(initialDisplayName);
      setBio(initialBio);
      setError(null);
    }
  }, [visible, initialDisplayName, initialBio]);

  function handleClose() {
    if (saving) return;
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(displayName, bio);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Icon glyph="edit" size={20} color={colors.pink} />
            <Text style={styles.title}>Editar perfil</Text>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.fieldLabel}>Nombre visible</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={() => handleSave()}
            />

            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.multiline]}
              multiline
            />
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Tappable onPress={handleClose} style={styles.cancelButton} disabled={saving}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Tappable>
            <Tappable onPress={handleSave} style={styles.saveButton} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Icon glyph="check" size={15} color={colors.background} />
                  <Text style={styles.saveText}>Guardar cambios</Text>
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
    maxHeight: "85%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.pink,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
    shadowColor: colors.pink,
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
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
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
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
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
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.pink,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    shadowColor: colors.pink,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
  },
  saveText: {
    color: colors.background,
    fontWeight: "800",
  },
});
