import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { AvatarCropModal } from "../../components/AvatarCropModal";
import { useAuth } from "../../components/AuthContext";
import { ProfileSummary } from "../../components/ProfileSummary";
import { SectionCard } from "../../components/SectionCard";
import { colors, radii, spacing } from "../../theme";
import { globalRanking, mockProfile } from "../../data";

type PickedImage = {
  uri: string;
  width: number;
  height: number;
};

export default function ProfileScreen() {
  const { account, logout, updateAccount } = useAuth();
  const profile = account?.profile ?? mockProfile;
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [elo, setElo] = useState(String(profile.elo));
  const [saving, setSaving] = useState(false);
  const [changingAvatar, setChangingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [cropModalVisible, setCropModalVisible] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setBio(profile.bio);
    setElo(String(profile.elo));
  }, [profile.displayName, profile.bio, profile.elo]);

  async function handleSave() {
    if (!account) return;
    setSaving(true);
    try {
      await updateAccount({
        profile: {
          ...profile,
          displayName: displayName.trim() || profile.displayName,
          bio: bio.trim() || profile.bio,
          elo: Number.isFinite(Number(elo)) ? Number(elo) : profile.elo,
        },
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeAvatar() {
    if (!account) return;
    setAvatarError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarError("Se necesita permiso para acceder a tus fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    let { width, height } = asset;
    if (!width || !height) {
      try {
        const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          Image.getSize(asset.uri, (w, h) => resolve({ width: w, height: h }), reject);
        });
        width = size.width;
        height = size.height;
      } catch {
        setAvatarError("No se pudo leer la imagen seleccionada.");
        return;
      }
    }

    setPickedImage({ uri: asset.uri, width, height });
    setCropModalVisible(true);
  }

  async function handleConfirmAvatarCrop(dataUri: string) {
    if (!account) return;
    setChangingAvatar(true);
    try {
      await updateAccount({
        profile: {
          ...profile,
          avatarUrl: dataUri,
        },
      });
      setCropModalVisible(false);
      setPickedImage(null);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "No se pudo actualizar la foto de perfil.");
    } finally {
      setChangingAvatar(false);
    }
  }

  function handleCancelAvatarCrop() {
    setCropModalVisible(false);
    setPickedImage(null);
  }

  async function handleLogout() {
    await logout();
    router.replace("/(auth)");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.pageLabel}>Profile</Text>
      <ProfileSummary
        {...profile}
        identifier={account?.identifier}
        onChangeAvatar={account ? handleChangeAvatar : undefined}
        changingAvatar={changingAvatar}
      />
      {avatarError ? <Text style={styles.avatarErrorText}>{avatarError}</Text> : null}

      <AvatarCropModal
        visible={cropModalVisible}
        imageUri={pickedImage?.uri ?? null}
        imageWidth={pickedImage?.width ?? 0}
        imageHeight={pickedImage?.height ?? 0}
        onCancel={handleCancelAvatarCrop}
        onConfirm={handleConfirmAvatarCrop}
      />

      <SectionCard title="Edit account" subtitle="Keep the saved profile data in sync with the current session.">
        <View style={styles.form}>
          <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Display name" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={bio} onChangeText={setBio} placeholder="Bio" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
          <TextInput value={elo} onChangeText={setElo} placeholder="Elo" placeholderTextColor={colors.muted} style={styles.input} keyboardType="number-pad" />
          <Pressable onPress={handleSave} style={styles.saveButton} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.saveText}>Guardar cambios</Text>}
          </Pressable>
          <Pressable onPress={() => router.push("/bets")} style={styles.myBetsButton}>
            <Text style={styles.myBetsText}>Mis apuestas</Text>
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Global ranking snapshot" subtitle="Shown here without a separate tab">
        <View style={styles.rankingList}>
          {globalRanking.slice(0, 3).map((entry) => (
            <View key={entry.id} style={styles.row}>
              <Text style={styles.rank}>{entry.position}</Text>
              <View style={styles.rowText}>
                <Text style={styles.name}>{entry.displayName}</Text>
                <Text style={styles.meta}>{entry.badge}</Text>
              </View>
              <Text style={styles.score}>{entry.elo}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  avatarErrorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 96,
  },
  pageLabel: {
    color: colors.primaryDark,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  form: {
    gap: spacing.sm,
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: {
    color: colors.surface,
    fontWeight: "900",
  },
  myBetsButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    alignItems: "center",
  },
  myBetsText: {
    color: colors.primary,
    fontWeight: "800",
  },
  logoutButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: {
    color: colors.text,
    fontWeight: "800",
  },
  rankingList: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rank: {
    width: 28,
    color: colors.primaryDark,
    fontWeight: "900",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  score: {
    color: colors.text,
    fontWeight: "900",
  },
});
