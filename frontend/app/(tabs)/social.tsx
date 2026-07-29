import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../components/AuthContext";
import { ChallengeModal } from "../../components/ChallengeModal";
import { ChallengeRow } from "../../components/ChallengeRow";
import { CreateGroupModal } from "../../components/CreateGroupModal";
import { FriendRow } from "../../components/FriendRow";
import { FriendSortControl, FriendSortOption } from "../../components/FriendSortControl";
import { GroupCard } from "../../components/GroupCard";
import { Icon } from "../../components/Icon";
import { NotificationBadge } from "../../components/NotificationBadge";
import { SectionCard } from "../../components/SectionCard";
import { Tappable } from "../../components/Tappable";
import { useSocialNotifications } from "../../components/SocialNotificationsContext";
import { colors, radii, shadows, spacing } from "../../theme";
import {
  ChallengeList,
  acceptChallenge,
  cancelChallenge,
  declineChallenge,
  listMyChallenges,
  resolveCustomChallenge,
} from "../../data/challenges";
import {
  FriendRequest,
  FriendState,
  GroupSummary,
  IncomingGroupInvite,
  SocialFriend,
  acceptFriendRequest,
  acceptGroupInvite,
  createGroup,
  listFriends,
  listGroups,
  listIncomingGroupInvites,
  rejectFriendRequest,
  rejectGroupInvite,
  removeFriend,
  sendFriendRequest,
} from "../../data/social";

const EMPTY_CHALLENGES: ChallengeList = { incoming: [], outgoing: [], active: [], resolved: [] };

function sortFriends(friends: SocialFriend[], sort: FriendSortOption): SocialFriend[] {
  const sorted = [...friends];
  sorted.sort((a, b) => {
    if (sort === "alpha") {
      return a.displayName.localeCompare(b.displayName);
    }
    if (a.elo === b.elo) {
      return a.displayName.localeCompare(b.displayName);
    }
    return sort === "eloAsc" ? a.elo - b.elo : b.elo - a.elo;
  });
  return sorted;
}

export default function SocialScreen() {
  const router = useRouter();
  const { account } = useAuth();
  const { setFriendRequestCount, setGroupInviteCount, syncGroups, hasGroupUpdate } = useSocialNotifications();

  const [friendState, setFriendState] = useState<FriendState>({ friends: [], incomingRequests: [], outgoingRequests: [] });
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupInvites, setGroupInvites] = useState<IncomingGroupInvite[]>([]);
  const [challenges, setChallenges] = useState<ChallengeList>(EMPTY_CHALLENGES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  const [sort, setSort] = useState<FriendSortOption>("eloDesc");
  const [identifier, setIdentifier] = useState("");
  const [friendError, setFriendError] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listFriends(), listGroups(), listIncomingGroupInvites()])
      .then(([friendsResult, groupsResult, invitesResult]) => {
        if (cancelled) return;
        setFriendState(friendsResult);
        setGroups(groupsResult.groups);
        setGroupInvites(invitesResult.invites);
        setFriendRequestCount(friendsResult.incomingRequests.length);
        setGroupInviteCount(invitesResult.invites.length);
        syncGroups(groupsResult.groups);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "No se pudo cargar la seccion Social.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Loaded separately from the block above on purpose: a failure fetching challenges
    // (e.g. an older backend process still running without this route) must not blank out
    // friends/groups, which already loaded fine — it only surfaces inside the Retos section.
    listMyChallenges()
      .then((result) => {
        if (!cancelled) setChallenges(result);
      })
      .catch((err) => {
        if (!cancelled) setChallengeError(err instanceof Error ? err.message : "No se pudieron cargar los retos.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshChallenges() {
    try {
      setChallenges(await listMyChallenges());
    } catch (err) {
      setChallengeError(err instanceof Error ? err.message : "No se pudieron actualizar los retos.");
    }
  }

  async function handleAcceptChallenge(challengeId: string) {
    setChallengeError(null);
    try {
      await acceptChallenge(challengeId);
      await refreshChallenges();
    } catch (err) {
      setChallengeError(err instanceof Error ? err.message : "No se pudo aceptar el reto.");
    }
  }

  async function handleDeclineChallenge(challengeId: string) {
    setChallengeError(null);
    try {
      await declineChallenge(challengeId);
      await refreshChallenges();
    } catch (err) {
      setChallengeError(err instanceof Error ? err.message : "No se pudo rechazar el reto.");
    }
  }

  async function handleCancelChallenge(challengeId: string) {
    setChallengeError(null);
    try {
      await cancelChallenge(challengeId);
      await refreshChallenges();
    } catch (err) {
      setChallengeError(err instanceof Error ? err.message : "No se pudo cancelar el reto.");
    }
  }

  async function handleResolveChallenge(challengeId: string, result: string) {
    setChallengeError(null);
    try {
      await resolveCustomChallenge(challengeId, result);
      await refreshChallenges();
    } catch (err) {
      setChallengeError(err instanceof Error ? err.message : "No se pudo registrar el resultado.");
    }
  }

  const sortedFriends = useMemo(() => sortFriends(friendState.friends, sort), [friendState.friends, sort]);

  async function handleSendRequest() {
    if (!identifier.trim()) {
      setFriendError("Introduce el identificador de un amigo.");
      return;
    }
    setSendingRequest(true);
    setFriendError(null);
    try {
      const result = await sendFriendRequest(identifier.trim());
      setFriendState(result);
      setIdentifier("");
    } catch (err) {
      setFriendError(err instanceof Error ? err.message : "No se pudo enviar la solicitud.");
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleAcceptRequest(requestId: string) {
    try {
      const result = await acceptFriendRequest(requestId);
      setFriendState(result);
      setFriendRequestCount(result.incomingRequests.length);
    } catch (err) {
      setFriendError(err instanceof Error ? err.message : "No se pudo aceptar la solicitud.");
    }
  }

  async function handleRejectRequest(requestId: string) {
    try {
      const result = await rejectFriendRequest(requestId);
      setFriendState(result);
      setFriendRequestCount(result.incomingRequests.length);
    } catch (err) {
      setFriendError(err instanceof Error ? err.message : "No se pudo rechazar la solicitud.");
    }
  }

  async function handleRemoveFriend(accountId: string) {
    try {
      setFriendState(await removeFriend(accountId));
    } catch (err) {
      setFriendError(err instanceof Error ? err.message : "No se pudo eliminar al amigo.");
    }
  }

  async function handleAcceptGroupInvite(invite: IncomingGroupInvite) {
    try {
      await acceptGroupInvite(invite.id);
      setGroupInvites((current) => {
        const next = current.filter((item) => item.id !== invite.id);
        setGroupInviteCount(next.length);
        return next;
      });
      const groupsResult = await listGroups();
      setGroups(groupsResult.groups);
      syncGroups(groupsResult.groups);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo aceptar la invitacion.");
    }
  }

  async function handleRejectGroupInvite(invite: IncomingGroupInvite) {
    try {
      await rejectGroupInvite(invite.id);
      setGroupInvites((current) => {
        const next = current.filter((item) => item.id !== invite.id);
        setGroupInviteCount(next.length);
        return next;
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo rechazar la invitacion.");
    }
  }

  async function handleCreateGroup(name: string) {
    const group = await createGroup(name);
    setGroups((current) => [
      ...current,
      {
        id: group.id,
        name: group.name,
        ownerAccountId: group.ownerAccountId,
        memberCount: group.members.length,
        createdAt: group.createdAt,
        hasUpdate: false,
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.pageLabelRow}>
        <Icon glyph="social" size={18} color={colors.primary} />
        <Text style={styles.pageLabel}>Social</Text>
      </View>

      {loadError ? <Text style={styles.loadErrorText}>{loadError}</Text> : null}

      {groupInvites.length > 0 ? (
        <SectionCard
          title="Invitaciones a grupos"
          subtitle="Acepta o rechaza invitaciones pendientes"
          icon="groups"
          accentColor={colors.sky}
        >
          {groupInvites.map((invite) => (
            <View key={invite.id} style={styles.requestRow}>
              <View style={styles.requestInfo}>
                <View style={styles.requestNameRow}>
                  <Text style={styles.requestName}>{invite.groupName}</Text>
                  <NotificationBadge inline />
                </View>
                <Text style={styles.requestMeta}>Invitado por {invite.inviterDisplayName}</Text>
              </View>
              <View style={styles.requestActions}>
                <Tappable style={styles.acceptButton} onPress={() => handleAcceptGroupInvite(invite)}>
                  <Icon glyph="check" size={13} color={colors.background} />
                  <Text style={styles.acceptButtonText}>Aceptar</Text>
                </Tappable>
                <Tappable style={styles.rejectButton} onPress={() => handleRejectGroupInvite(invite)}>
                  <Icon glyph="close" size={13} color={colors.danger} />
                  <Text style={styles.rejectButtonText}>Rechazar</Text>
                </Tappable>
              </View>
            </View>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard
        title="Grupos de predicciones"
        subtitle="Compite con tus amigos en espacios de grupo"
        icon="groups"
        accentColor={colors.sky}
      >
        <View style={styles.groupList}>
          {groups.length > 0 ? (
            groups.map((group) => (
              <GroupCard
                key={group.id}
                id={group.id}
                name={group.name}
                memberCount={group.memberCount}
                hasUpdate={hasGroupUpdate(group.id)}
                onPress={() => router.push(`/groups/${group.id}`)}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>Aun no tienes grupos de predicciones.</Text>
          )}
        </View>
        <Tappable style={[styles.createGroupButton, { backgroundColor: colors.sky }]} onPress={() => setGroupModalVisible(true)}>
          <Icon glyph="add" size={16} color={colors.background} />
          <Text style={styles.createGroupText}>Crear grupo</Text>
        </Tappable>
      </SectionCard>

      <SectionCard
        title="Retos"
        subtitle="Reta a un amigo 1 contra 1 y suma victorias en vuestro historial"
        icon="challenge"
        accentColor={colors.pink}
      >
        {challengeError ? <Text style={styles.friendErrorText}>{challengeError}</Text> : null}

        {challenges.incoming.length > 0 ? (
          <View style={styles.requestGroup}>
            <Text style={styles.requestGroupTitle}>Retos recibidos</Text>
            {challenges.incoming.map((challenge) => (
              <ChallengeRow
                key={challenge.id}
                challenge={challenge}
                myAccountId={account?.accountId ?? ""}
                onAccept={() => handleAcceptChallenge(challenge.id)}
                onDecline={() => handleDeclineChallenge(challenge.id)}
              />
            ))}
          </View>
        ) : null}

        {challenges.outgoing.length > 0 ? (
          <View style={styles.requestGroup}>
            <Text style={styles.requestGroupTitle}>Retos enviados</Text>
            {challenges.outgoing.map((challenge) => (
              <ChallengeRow
                key={challenge.id}
                challenge={challenge}
                myAccountId={account?.accountId ?? ""}
                onCancel={() => handleCancelChallenge(challenge.id)}
              />
            ))}
          </View>
        ) : null}

        {challenges.active.length > 0 ? (
          <View style={styles.requestGroup}>
            <Text style={styles.requestGroupTitle}>En curso</Text>
            {challenges.active.map((challenge) => (
              <ChallengeRow
                key={challenge.id}
                challenge={challenge}
                myAccountId={account?.accountId ?? ""}
                onResolve={(result) => handleResolveChallenge(challenge.id, result)}
              />
            ))}
          </View>
        ) : null}

        {challenges.resolved.length > 0 ? (
          <View style={styles.requestGroup}>
            <Text style={styles.requestGroupTitle}>Resueltos</Text>
            {challenges.resolved.map((challenge) => (
              <ChallengeRow key={challenge.id} challenge={challenge} myAccountId={account?.accountId ?? ""} />
            ))}
          </View>
        ) : null}

        {challenges.incoming.length === 0 &&
        challenges.outgoing.length === 0 &&
        challenges.active.length === 0 &&
        challenges.resolved.length === 0 ? (
          <Text style={styles.emptyText}>Aun no tienes retos. Reta a un amigo a una apuesta 1 contra 1.</Text>
        ) : null}

        <Tappable style={[styles.createGroupButton, { backgroundColor: colors.pink }]} onPress={() => setChallengeModalVisible(true)}>
          <Icon glyph="add" size={16} color={colors.background} />
          <Text style={styles.createGroupText}>Nuevo reto</Text>
        </Tappable>
      </SectionCard>

      <SectionCard
        title="Amigos"
        subtitle="Envia una solicitud por identificador de cuenta; el otro usuario debe aceptarla"
        icon="friends"
        accentColor={colors.teal}
      >
        <View style={styles.addFriendRow}>
          <TextInput
            style={styles.addFriendInput}
            placeholder="Identificador de cuenta"
            placeholderTextColor={colors.muted}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            returnKeyType="send"
            onSubmitEditing={() => handleSendRequest()}
          />
          <Tappable style={styles.addFriendButton} onPress={handleSendRequest} disabled={sendingRequest}>
            <Icon glyph="send" size={14} color={colors.background} />
            <Text style={styles.addFriendButtonText}>{sendingRequest ? "Enviando..." : "Enviar solicitud"}</Text>
          </Tappable>
        </View>
        {friendError ? <Text style={styles.friendErrorText}>{friendError}</Text> : null}

        {friendState.incomingRequests.length > 0 ? (
          <View style={styles.requestGroup}>
            <Text style={styles.requestGroupTitle}>Solicitudes recibidas</Text>
            {friendState.incomingRequests.map((request: FriendRequest) => (
              <View key={request.id} style={styles.requestRow}>
                <View style={styles.requestInfo}>
                  <View style={styles.requestNameRow}>
                    <Text style={styles.requestName}>{request.displayName}</Text>
                    <NotificationBadge inline />
                  </View>
                  <Text style={styles.requestMeta}>Elo {request.elo}</Text>
                </View>
                <View style={styles.requestActions}>
                  <Tappable style={styles.acceptButton} onPress={() => handleAcceptRequest(request.id)}>
                    <Icon glyph="check" size={13} color={colors.background} />
                    <Text style={styles.acceptButtonText}>Aceptar</Text>
                  </Tappable>
                  <Tappable style={styles.rejectButton} onPress={() => handleRejectRequest(request.id)}>
                    <Icon glyph="close" size={13} color={colors.danger} />
                    <Text style={styles.rejectButtonText}>Rechazar</Text>
                  </Tappable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {friendState.outgoingRequests.length > 0 ? (
          <View style={styles.requestGroup}>
            <Text style={styles.requestGroupTitle}>Solicitudes enviadas</Text>
            {friendState.outgoingRequests.map((request: FriendRequest) => (
              <View key={request.id} style={styles.requestRow}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{request.displayName}</Text>
                  <Text style={styles.requestMeta}>Pendiente de respuesta</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {friendState.friends.length > 0 ? <FriendSortControl value={sort} onChange={setSort} /> : null}

        {sortedFriends.length > 0 ? (
          sortedFriends.map((friend) => (
            <FriendRow
              key={friend.accountId}
              accountId={friend.accountId}
              displayName={friend.displayName}
              avatarUrl={friend.avatarUrl}
              elo={friend.elo}
              challengeWins={friend.challengeWins}
              challengeLosses={friend.challengeLosses}
              onRemove={() => handleRemoveFriend(friend.accountId)}
            />
          ))
        ) : (
          <EmptyFriends />
        )}
      </SectionCard>

      <CreateGroupModal visible={groupModalVisible} onClose={() => setGroupModalVisible(false)} onCreate={handleCreateGroup} />
      <ChallengeModal
        visible={challengeModalVisible}
        friends={friendState.friends}
        onClose={() => setChallengeModalVisible(false)}
        onCreated={refreshChallenges}
      />
    </ScrollView>
  );
}

function EmptyFriends() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Aun no tienes amigos añadidos</Text>
      <Text style={styles.emptyText}>Envia una solicitud por identificador de cuenta para empezar.</Text>
    </View>
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
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 96,
  },
  pageLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageLabel: {
    color: colors.primaryDark,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  loadErrorText: {
    color: colors.danger,
  },
  groupList: {},
  createGroupButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...shadows.glow,
  },
  createGroupText: {
    color: colors.background,
    fontWeight: "800",
  },
  addFriendRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  addFriendInput: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.text,
  },
  addFriendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.teal,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  addFriendButtonText: {
    color: colors.background,
    fontWeight: "800",
  },
  friendErrorText: {
    color: colors.danger,
    fontSize: 13,
  },
  requestGroup: {
    gap: spacing.xs,
  },
  requestGroupTitle: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  requestInfo: {
    flex: 1,
    gap: 2,
  },
  requestNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  requestName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  requestMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  requestActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  acceptButtonText: {
    color: colors.background,
    fontWeight: "800",
    fontSize: 12,
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  rejectButtonText: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  emptyText: {
    color: colors.muted,
    marginTop: 4,
  },
});
