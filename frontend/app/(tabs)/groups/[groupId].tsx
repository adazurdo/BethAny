import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Icon } from "../../../components/Icon";
import { SectionCard } from "../../../components/SectionCard";
import { colors, radii, spacing } from "../../../theme";
import {
  GroupDetail,
  SocialFriend,
  getGroup,
  inviteGroupMember,
  listFriends,
  proposeCustomPrediction,
  voteOnPrediction,
} from "../../../data/social";

export default function GroupDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string }>();
  const groupId = params.groupId;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [friends, setFriends] = useState<SocialFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [submittingPrediction, setSubmittingPrediction] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  function loadData() {
    if (!groupId) return;
    Promise.all([getGroup(groupId), listFriends()])
      .then(([groupResult, friendsResult]) => {
        setGroup(groupResult);
        setFriends(friendsResult.friends);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "No se pudo cargar el grupo.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const invitableFriends = useMemo(() => {
    if (!group) return [];
    const memberIds = new Set(group.members.map((member) => member.accountId));
    const pendingIds = new Set(group.pendingInvites.map((invite) => invite.accountId));
    return friends.filter((friend) => !memberIds.has(friend.accountId) && !pendingIds.has(friend.accountId));
  }, [friends, group]);

  async function handleInvite(friendAccountId: string) {
    if (!groupId) return;
    setInvitingId(friendAccountId);
    setInviteError(null);
    try {
      const updated = await inviteGroupMember(groupId, friendAccountId);
      setGroup(updated);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "No se pudo invitar a ese amigo.");
    } finally {
      setInvitingId(null);
    }
  }

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, i) => (i === index ? value : option)));
  }

  function addOptionField() {
    setOptions((current) => [...current, ""]);
  }

  function removeOptionField(index: number) {
    setOptions((current) => current.filter((_, i) => i !== index));
  }

  async function handleProposePrediction() {
    if (!groupId) return;
    setSubmittingPrediction(true);
    setPredictionError(null);
    try {
      const updated = await proposeCustomPrediction(groupId, question, options);
      setGroup(updated);
      setQuestion("");
      setOptions(["", ""]);
    } catch (err) {
      setPredictionError(err instanceof Error ? err.message : "No se pudo proponer la prediccion.");
    } finally {
      setSubmittingPrediction(false);
    }
  }

  async function handleVote(predictionId: string, option: string) {
    if (!groupId) return;
    setVotingId(predictionId);
    try {
      const updated = await voteOnPrediction(groupId, predictionId, option);
      setGroup(updated);
    } catch (err) {
      setPredictionError(err instanceof Error ? err.message : "No se pudo registrar el voto.");
    } finally {
      setVotingId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (loadError || !group) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorText}>{loadError ?? "Grupo no encontrado."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Icon glyph="back" size={20} color={colors.text} />
        <Text style={styles.backButtonText}>Social</Text>
      </Pressable>

      <Text style={styles.groupName}>{group.name}</Text>

      <SectionCard title="Miembros" subtitle={`${group.members.length} ${group.members.length === 1 ? "miembro" : "miembros"}`}>
        {group.members.map((member) => (
          <View key={member.accountId} style={styles.memberRow}>
            <Text style={styles.memberName}>{member.displayName}</Text>
            <Text style={styles.memberElo}>Elo {member.elo}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Invitar amigos" subtitle="Solo puedes invitar a cuentas que ya son tus amigos; deben aceptar para unirse">
        {inviteError ? <Text style={styles.errorText}>{inviteError}</Text> : null}
        {group.pendingInvites.length > 0 ? (
          <View style={styles.requestGroup}>
            <Text style={styles.requestGroupTitle}>Invitaciones pendientes</Text>
            {group.pendingInvites.map((invite) => (
              <View key={invite.id} style={styles.inviteRow}>
                <Text style={styles.memberName}>{invite.displayName}</Text>
                <Text style={styles.pendingLabel}>Pendiente</Text>
              </View>
            ))}
          </View>
        ) : null}
        {invitableFriends.length > 0 ? (
          invitableFriends.map((friend) => (
            <View key={friend.accountId} style={styles.inviteRow}>
              <Text style={styles.memberName}>{friend.displayName}</Text>
              <Pressable
                style={styles.inviteButton}
                onPress={() => handleInvite(friend.accountId)}
                disabled={invitingId === friend.accountId}
              >
                <Text style={styles.inviteButtonText}>
                  {invitingId === friend.accountId ? "Invitando..." : "Invitar"}
                </Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No tienes mas amigos disponibles para invitar.</Text>
        )}
      </SectionCard>

      <SectionCard title="Predicciones personalizadas" subtitle="Vota por una opcion; puedes cambiar tu voto">
        {group.predictions.length > 0 ? (
          group.predictions.map((prediction) => (
            <View key={prediction.id} style={styles.predictionCard}>
              <Text style={styles.predictionQuestion}>{prediction.question}</Text>
              <View style={styles.predictionOptionsList}>
                {prediction.options.map((option) => {
                  const isMine = prediction.myVote === option;
                  const count = prediction.votes[option] ?? 0;
                  return (
                    <Pressable
                      key={option}
                      style={[styles.voteOption, isMine ? styles.voteOptionSelected : undefined]}
                      onPress={() => handleVote(prediction.id, option)}
                      disabled={votingId === prediction.id}
                    >
                      <Text style={[styles.voteOptionText, isMine ? styles.voteOptionTextSelected : undefined]}>
                        {option}
                      </Text>
                      <Text style={[styles.voteOptionCount, isMine ? styles.voteOptionTextSelected : undefined]}>
                        {count}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.totalVotes}>{prediction.totalVotes} {prediction.totalVotes === 1 ? "voto" : "votos"}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aun no hay predicciones personalizadas en este grupo.</Text>
        )}

        <View style={styles.predictionForm}>
          <TextInput
            style={styles.input}
            placeholder="Pregunta de la prediccion"
            placeholderTextColor={colors.muted}
            value={question}
            onChangeText={setQuestion}
          />
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={[styles.input, styles.optionInput]}
                placeholder={`Opcion ${index + 1}`}
                placeholderTextColor={colors.muted}
                value={option}
                onChangeText={(value) => updateOption(index, value)}
              />
              {options.length > 2 ? (
                <Pressable onPress={() => removeOptionField(index)} style={styles.removeOptionButton}>
                  <Text style={styles.removeOptionText}>✕</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          <Pressable onPress={addOptionField} style={styles.addOptionButton}>
            <Text style={styles.addOptionText}>+ Añadir opcion</Text>
          </Pressable>
          {predictionError ? <Text style={styles.errorText}>{predictionError}</Text> : null}
          <Pressable style={styles.submitButton} onPress={handleProposePrediction} disabled={submittingPrediction}>
            <Text style={styles.submitButtonText}>{submittingPrediction ? "Proponiendo..." : "Proponer prediccion"}</Text>
          </Pressable>
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
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 96,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: colors.text,
    fontWeight: "800",
  },
  groupName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  memberName: {
    color: colors.text,
    fontWeight: "700",
  },
  memberElo: {
    color: colors.muted,
  },
  requestGroup: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  requestGroupTitle: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  pendingLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  inviteButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  inviteButtonText: {
    color: colors.background,
    fontWeight: "800",
    fontSize: 12,
  },
  emptyText: {
    color: colors.muted,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  predictionCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  predictionQuestion: {
    color: colors.text,
    fontWeight: "800",
  },
  predictionOptionsList: {
    gap: 6,
  },
  voteOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  voteOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  voteOptionText: {
    color: colors.text,
    fontWeight: "700",
  },
  voteOptionCount: {
    color: colors.muted,
    fontWeight: "800",
  },
  voteOptionTextSelected: {
    color: colors.background,
  },
  totalVotes: {
    color: colors.muted,
    fontSize: 12,
  },
  predictionForm: {
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  optionInput: {
    flex: 1,
  },
  removeOptionButton: {
    padding: spacing.xs,
  },
  removeOptionText: {
    color: colors.danger,
    fontWeight: "800",
  },
  addOptionButton: {
    alignSelf: "flex-start",
  },
  addOptionText: {
    color: colors.accent,
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: colors.background,
    fontWeight: "800",
  },
});
