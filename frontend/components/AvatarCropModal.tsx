import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { colors, radii, spacing } from "../theme";

const VIEWPORT = 260;
const MIN_SCALE = 1;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.4;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

function maxTranslate(naturalSize: number, baseScale: number, userScale: number) {
  "worklet";
  const displayed = naturalSize * baseScale * userScale;
  return Math.max((displayed - VIEWPORT) / 2, 0);
}

type AvatarCropModalProps = {
  visible: boolean;
  imageUri: string | null;
  imageWidth: number;
  imageHeight: number;
  onCancel: () => void;
  onConfirm: (dataUri: string) => Promise<void>;
};

export function AvatarCropModal({ visible, imageUri, imageWidth, imageHeight, onCancel, onConfirm }: AvatarCropModalProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseScale = imageWidth > 0 && imageHeight > 0 ? Math.max(VIEWPORT / imageWidth, VIEWPORT / imageHeight) : 1;

  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageUri]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
      const maxX = maxTranslate(imageWidth, baseScale, scale.value);
      const maxY = maxTranslate(imageHeight, baseScale, scale.value);
      translateX.value = clamp(translateX.value, -maxX, maxX);
      translateY.value = clamp(translateY.value, -maxY, maxY);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const maxX = maxTranslate(imageWidth, baseScale, scale.value);
      const maxY = maxTranslate(imageHeight, baseScale, scale.value);
      translateX.value = clamp(savedTranslateX.value + event.translationX, -maxX, maxX);
      translateY.value = clamp(savedTranslateY.value + event.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  function applyZoom(delta: number) {
    const nextScale = clamp(savedScale.value + delta, MIN_SCALE, MAX_SCALE);
    scale.value = withTiming(nextScale);
    savedScale.value = nextScale;
    const maxX = maxTranslate(imageWidth, baseScale, nextScale);
    const maxY = maxTranslate(imageHeight, baseScale, nextScale);
    const nextTranslateX = clamp(translateX.value, -maxX, maxX);
    const nextTranslateY = clamp(translateY.value, -maxY, maxY);
    translateX.value = withTiming(nextTranslateX);
    translateY.value = withTiming(nextTranslateY);
    savedTranslateX.value = nextTranslateX;
    savedTranslateY.value = nextTranslateY;
  }

  async function handleConfirm() {
    if (!imageUri || imageWidth <= 0 || imageHeight <= 0) return;
    setSaving(true);
    setError(null);
    try {
      const totalScale = baseScale * scale.value;
      const cropW = VIEWPORT / totalScale;
      const cropH = VIEWPORT / totalScale;
      const originX = clamp(imageWidth / 2 - translateX.value / totalScale - cropW / 2, 0, imageWidth - cropW);
      const originY = clamp(imageHeight / 2 - translateY.value / totalScale - cropH / 2, 0, imageHeight - cropH);

      const result = await manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width: cropW, height: cropH } },
          { resize: { width: 512, height: 512 } },
        ],
        { compress: 0.8, format: SaveFormat.JPEG, base64: true },
      );

      if (!result.base64) {
        throw new Error("No se pudo procesar la imagen.");
      }
      await onConfirm(`data:image/jpeg;base64,${result.base64}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la foto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Ajusta tu foto</Text>
          <Text style={styles.hint}>Arrastra para mover, pellizca o usa +/- para hacer zoom</Text>

          <View style={styles.viewport}>
            {imageUri ? (
              <GestureDetector gesture={composedGesture}>
                <Animated.View
                  style={[
                    {
                      width: imageWidth * baseScale,
                      height: imageHeight * baseScale,
                    },
                    animatedStyle,
                  ]}
                >
                  <Animated.Image
                    source={{ uri: imageUri }}
                    style={{ width: imageWidth * baseScale, height: imageHeight * baseScale }}
                  />
                </Animated.View>
              </GestureDetector>
            ) : null}
          </View>

          <View style={styles.zoomRow}>
            <Pressable style={styles.zoomButton} onPress={() => applyZoom(-ZOOM_STEP)}>
              <Text style={styles.zoomButtonText}>−</Text>
            </Pressable>
            <Pressable style={styles.zoomButton} onPress={() => applyZoom(ZOOM_STEP)}>
              <Text style={styles.zoomButtonText}>+</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelButton} disabled={saving}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={styles.saveButton} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.background} size="small" /> : <Text style={styles.saveText}>Guardar foto</Text>}
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
    backgroundColor: "rgba(4,10,32,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    alignSelf: "flex-start",
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    alignSelf: "flex-start",
  },
  viewport: {
    width: VIEWPORT,
    height: VIEWPORT,
    borderRadius: VIEWPORT / 2,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomButtonText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    alignSelf: "stretch",
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    minWidth: 110,
    alignItems: "center",
  },
  saveText: {
    color: colors.background,
    fontWeight: "800",
  },
});
