import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Icon } from "../../../components/Icon";
import { SectionCard } from "../../../components/SectionCard";
import { GroupRanking } from "../../../components/GroupRanking";
import { Tappable } from "../../../components/Tappable";
import { useAuth } from "../../../components/AuthContext";
import { useSocialNotifications } from "../../../components/SocialNotificationsContext";
import { ClosingDatePicker, ClosingDateValue, closingValueToDate, defaultClosingValue } from "../../../components/ClosingDatePicker";
import { colors, radii, shadows, spacing } from "../../../theme";
import {
  GroupDetail,
  SocialFriend,
  abortPrediction,
  getGroup,
  inviteGroupMember,
  listFriends,
  proposeCustomPrediction,
  resolvePrediction,
  voteOnPrediction,
} from "../../../data/social";

function formatClosesAt(closesAt: string) {
  const date = new Date(closesAt);
  if (Number.isNaN(date.getTime())) return closesAt;
  return date.toLocaleString();
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const { account } = useAuth();
  const { clearGroupUpdate } = useSocialNotifications();
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
  const [closingDate, setClosingDate] = useState<ClosingDateValue>(() => defaultClosingValue());
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [submittingPrediction, setSubmittingPrediction] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveOptionByPrediction, setResolveOptionByPrediction] = useState<Record<string, string>>({});

  function loadData() {
    if (!groupId) return;
    Promise.all([getGroup(groupId), listFriends()])
      .then(([groupResult, friendsResult]) => {
        setGroup(groupResult);
        setFriends(friendsResult.friends);
        clearGroupUpdate(groupResult.id);
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
      const closesAtDate = closingValueToDate(closingDate);
      if (Number.isNaN(closesAtDate.getTime()) || closesAtDate.getTime() <= Date.now()) {
        throw new Error("Elige una fecha y hora de finalizacion futuras.");
      }
      const updated = await proposeCustomPrediction(groupId, question, options, closesAtDate.toISOString());
      setGroup(updated);
      setQuestion("");
      setOptions(["", ""]);
      setClosingDate(defaultClosingValue());
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

  async function handleResolve(predictionId: string) {
    if (!groupId) return;
    const option = resolveOptionByPrediction[predictionId];
    if (!option) return;
    setResolvingId(predictionId);
    try {
      const updated = await resolvePrediction(groupId, predictionId, option);
      setGroup(updated);
    } catch (err) {
      setPredictionError(err instanceof Error ? err.message : "No se pudo resolver la prediccion.");
    } finally {
      setResolvingId(null);
    }
  }

  async function handleAbort(predictionId: string) {
    if (!groupId) return;
    setResolvingId(predictionId);
    try {
      const updated = await abortPrediction(groupId, predictionId);
      setGroup(updated);
    } catch (err) {
      setPredictionError(err instanceof Error ? err.message : "No se pudo abortar la prediccion.");
    } finally {
      setResolvingId(null);
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

      <SectionCard
        title="Miembros"
        subtitle={`${group.members.length} ${group.members.length === 1 ? "miembro" : "miembros"}`}
        icon="friends"
        accentColor={colors.teal}
      >
        {group.members.map((member) => (
          <View key={member.accountId} style={styles.memberRow}>
            <Text style={styles.memberName}>{member.displayName}</Text>
            <View style={styles.memberEloRow}>
              <Icon glyph="elo" size={12} color={colors.gold} />
              <Text style={styles.memberElo}>{member.elo}</Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Ranking" subtitle="Miembros ordenados por predicciones acertadas" icon="ranking" accentColor={colors.gold}>
        <GroupRanking ranking={group.ranking} />
      </SectionCard>

      <SectionCard
        title="Invitar amigos"
        subtitle="Solo puedes invitar a cuentas que ya son tus amigos; deben aceptar para unirse"
        icon="add"
        accentColor={colors.teal}
      >
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
              <Tappable
                style={styles.inviteButton}
                onPress={() => handleInvite(friend.accountId)}
                disabled={invitingId === friend.accountId}
              >
                <Text style={styles.inviteButtonText}>
                  {invitingId === friend.accountId ? "Invitando..." : "Invitar"}
                </Text>
              </Tappable>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No tienes mas amigos disponibles para invitar.</Text>
        )}
      </SectionCard>

      <SectionCard
        title="Predicciones personalizadas"
        subtitle="Vota por una opcion mientras este abierta; el autor puede resolverla o abortarla"
        icon="sparkles"
        accentColor={colors.pink}
      >
        {group.predictions.length > 0 ? (
          group.predictions.map((prediction) => {
            const isAuthor = account?.accountId === prediction.createdByAccountId;
            const isOpen = prediction.status === "open";
            const statusLabel =
              prediction.status === "resolved"
                ? `Resuelta: ${prediction.resolvedOption}`
                : prediction.status === "aborted"
                  ? "Abortada"
                  : `Cierra: ${formatClosesAt(prediction.closesAt)}`;
            const isAborted = prediction.status === "aborted";
            return (
              <View key={prediction.id} style={[styles.predictionCard, isAborted ? styles.predictionCardAborted : null]}>
                <Text style={styles.predictionQuestion}>{prediction.question}</Text>
                <Text style={styles.predictionStatus}>{statusLabel}</Text>
                <View style={styles.predictionOptionsList}>
                  {prediction.options.map((option) => {
                    const isMine = prediction.myVote === option;
                    const count = prediction.votes[option] ?? 0;
                    return (
                      <Tappable
                        key={option}
                        style={[styles.voteOption, isMine ? styles.voteOptionSelected : undefined]}
                        onPress={() => handleVote(prediction.id, option)}
                        disabled={!isOpen || votingId === prediction.id}
                      >
                        <View style={styles.voteOptionLabelRow}>
                          {isMine ? <Icon glyph="check" size={13} color={colors.background} /> : null}
                          <Text style={[styles.voteOptionText, isMine ? styles.voteOptionTextSelected : undefined]}>
                            {option}
                          </Text>
                        </View>
                        <Text style={[styles.voteOptionCount, isMine ? styles.voteOptionTextSelected : undefined]}>
                          {count}
                        </Text>
                      </Tappable>
                    );
                  })}
                </View>
                <Text style={styles.totalVotes}>{prediction.totalVotes} {prediction.totalVotes === 1 ? "voto" : "votos"}</Text>

                {isAuthor && isOpen ? (
                  <View style={styles.resolveRow}>
                    {prediction.options.map((option) => {
                      const selected = resolveOptionByPrediction[prediction.id] === option;
                      return (
                        <Tappable
                          key={option}
                          style={[styles.resolveOption, selected ? styles.resolveOptionSelected : undefined]}
                          onPress={() =>
                            setResolveOptionByPrediction((current) => ({ ...current, [prediction.id]: option }))
                          }
                        >
                          {selected ? <Icon glyph="check" size={11} color={colors.background} /> : null}
                          <Text
                            style={[styles.resolveOptionText, selected ? styles.resolveOptionTextSelected : undefined]}
                          >
                            {option}
                          </Text>
                        </Tappable>
                      );
                    })}
                    <Tappable
                      style={styles.resolveButton}
                      onPress={() => handleResolve(prediction.id)}
                      disabled={resolvingId === prediction.id || !resolveOptionByPrediction[prediction.id]}
                    >
                      <Icon glyph="check" size={12} color={colors.background} />
                      <Text style={styles.resolveButtonText}>Resolver</Text>
                    </Tappable>
                    <Tappable
                      style={styles.abortButton}
                      onPress={() => handleAbort(prediction.id)}
                      disabled={resolvingId === prediction.id}
                    >
                      <Icon glyph="cancel" size={12} color={colors.danger} />
                      <Text style={styles.abortButtonText}>Abortar</Text>
                    </Tappable>
                  </View>
                ) : null}
              </View>
            );
          })
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
            returnKeyType="done"
            onSubmitEditing={() => handleProposePrediction()}
          />
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={[styles.input, styles.optionInput]}
                placeholder={`Opcion ${index + 1}`}
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={() => handleProposePrediction()}
                value={option}
                onChangeText={(value) => updateOption(index, value)}
              />
              {options.length > 2 ? (
                <Tappable onPress={() => removeOptionField(index)} style={styles.removeOptionButton}>
                  <Icon glyph="close" size={16} color={colors.danger} />
                </Tappable>
              ) : null}
            </View>
          ))}
          <Tappable onPress={addOptionField} style={styles.addOptionButton}>
            <Icon glyph="add" size={15} color={colors.accent} />
            <Text style={styles.addOptionText}>Añadir opcion</Text>
          </Tappable>
          <Text style={styles.fieldLabel}>Fecha y hora de finalizacion</Text>
          <ClosingDatePicker value={closingDate} onChange={setClosingDate} />
          {predictionError ? <Text style={styles.errorText}>{predictionError}</Text> : null}
          <Tappable style={styles.submitButton} onPress={handleProposePrediction} disabled={submittingPrediction}>
            <Icon glyph="sparkles" size={14} color={colors.background} />
            <Text style={styles.submitButtonText}>{submittingPrediction ? "Proponiendo..." : "Proponer prediccion"}</Text>
          </Tappable>
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
  memberEloRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberElo: {
    color: colors.muted,
    fontWeight: "700",
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
    backgroundColor: colors.teal,
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
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  predictionCardAborted: {
    borderBottomColor: colors.danger,
  },
  predictionQuestion: {
    color: colors.text,
    fontWeight: "800",
  },
  predictionStatus: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
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
    ...shadows.selected,
  },
  voteOptionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  resolveRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  resolveOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  resolveOptionSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    ...shadows.selected,
  },
  resolveOptionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  resolveOptionTextSelected: {
    color: colors.background,
  },
  resolveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  resolveButtonText: {
    color: colors.background,
    fontWeight: "800",
    fontSize: 12,
  },
  abortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  abortButtonText: {
    color: colors.danger,
    fontWeight: "800",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  addOptionText: {
    color: colors.accent,
    fontWeight: "700",
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.pink,
    borderRadius: radii.pill,
    paddingVertical: 10,
  },
  submitButtonText: {
    color: colors.background,
    fontWeight: "800",
  },
});
