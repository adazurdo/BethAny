import { useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { AvatarCropModal } from "../../components/AvatarCropModal";
import { useAuth } from "../../components/AuthContext";
import { EditProfileModal } from "../../components/EditProfileModal";
import { Icon } from "../../components/Icon";
import { ProfileSummary } from "../../components/ProfileSummary";
import { SectionCard } from "../../components/SectionCard";
import { Tappable } from "../../components/Tappable";
import { accentForKey, colors, radii, shadows, spacing } from "../../theme";
import { globalRanking, mockProfile } from "../../data";
import { ackEloMilestones } from "../../data/auth";

type PickedImage = {
  uri: string;
  width: number;
  height: number;
};

export default function ProfileScreen() {
  const { account, logout, updateAccount, refreshAccount } = useAuth();
  const profile = account?.profile ?? mockProfile;
  const [changingAvatar, setChangingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [dismissingMilestones, setDismissingMilestones] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const unseenMilestones = account?.unseenEloMilestones ?? [];

  async function handleDismissMilestones() {
    setDismissingMilestones(true);
    try {
      await ackEloMilestones();
      await refreshAccount();
    } finally {
      setDismissingMilestones(false);
    }
  }

  async function handleSaveProfile(displayName: string, bio: string) {
    if (!account) return;
    await updateAccount({
      profile: {
        ...profile,
        displayName: displayName.trim() || profile.displayName,
        bio: bio.trim() || profile.bio,
      },
    });
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

      {unseenMilestones.map((milestone) => (
        <View key={milestone.tier} style={styles.milestoneBanner}>
          <Icon glyph="medal" size={20} color={colors.background} />
          <Text style={styles.milestoneText}>
            ¡Has alcanzado {milestone.tier} de Elo! +{milestone.bonusBeths} Beths
          </Text>
          <Tappable onPress={handleDismissMilestones} disabled={dismissingMilestones} style={styles.milestoneDismiss}>
            {dismissingMilestones ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.milestoneDismissText}>Entendido</Text>
            )}
          </Tappable>
        </View>
      ))}

      <AvatarCropModal
        visible={cropModalVisible}
        imageUri={pickedImage?.uri ?? null}
        imageWidth={pickedImage?.width ?? 0}
        imageHeight={pickedImage?.height ?? 0}
        onCancel={handleCancelAvatarCrop}
        onConfirm={handleConfirmAvatarCrop}
      />

      <View style={styles.quickActions}>
        <Tappable onPress={() => setEditModalVisible(true)} style={styles.editButton}>
          <Icon glyph="edit" size={15} color={colors.background} />
          <Text style={styles.editText}>Editar perfil</Text>
        </Tappable>
        <Tappable onPress={() => router.push("/bets")} style={styles.myBetsButton}>
          <Icon glyph="bets" size={15} color={colors.gold} />
          <Text style={styles.myBetsText}>Mis apuestas</Text>
        </Tappable>
        <Tappable onPress={handleLogout} style={styles.logoutButton}>
          <Icon glyph="logout" size={15} color={colors.danger} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Tappable>
      </View>

      <EditProfileModal
        visible={editModalVisible}
        initialDisplayName={profile.displayName}
        initialBio={profile.bio}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveProfile}
      />

      <SectionCard title="Global ranking snapshot" subtitle="Shown here without a separate tab" icon="ranking" accentColor={colors.gold}>
        <View style={styles.rankingList}>
          {globalRanking.slice(0, 3).map((entry) => {
            const accent = entry.position === 1 ? colors.gold : accentForKey(entry.id);
            return (
              <View key={entry.id} style={styles.row}>
                <View style={[styles.rankBadge, { borderColor: accent }]}>
                  {entry.position <= 3 ? (
                    <Icon glyph="medal" size={14} color={accent} />
                  ) : (
                    <Text style={[styles.rank, { color: accent }]}>{entry.position}</Text>
                  )}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{entry.displayName}</Text>
                  <Text style={styles.meta}>{entry.badge}</Text>
                </View>
                <Text style={styles.score}>{entry.elo}</Text>
              </View>
            );
          })}
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
  milestoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.md,
    ...shadows.selected,
  },
  milestoneText: {
    flex: 1,
    color: colors.surface,
    fontWeight: "800",
  },
  milestoneDismiss: {
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    minWidth: 88,
    alignItems: "center",
  },
  milestoneDismissText: {
    color: colors.surface,
    fontWeight: "800",
    fontSize: 12,
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
  quickActions: {
    gap: spacing.sm,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.pink,
    borderRadius: 999,
    paddingVertical: 12,
    shadowColor: colors.pink,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
  },
  editText: {
    color: colors.background,
    fontWeight: "900",
  },
  myBetsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.gold,
    paddingVertical: 12,
  },
  myBetsText: {
    color: colors.gold,
    fontWeight: "800",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 12,
  },
  logoutText: {
    color: colors.danger,
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
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rank: {
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
