import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { CreateGroupModal } from "../../components/CreateGroupModal";
import { FriendRow } from "../../components/FriendRow";
import { FriendSortControl, FriendSortOption } from "../../components/FriendSortControl";
import { GroupCard } from "../../components/GroupCard";
import { SectionCard } from "../../components/SectionCard";
import { colors, radii, spacing } from "../../theme";
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

  const [friendState, setFriendState] = useState<FriendState>({ friends: [], incomingRequests: [], outgoingRequests: [] });
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupInvites, setGroupInvites] = useState<IncomingGroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sort, setSort] = useState<FriendSortOption>("eloDesc");
  const [identifier, setIdentifier] = useState("");
  const [friendError, setFriendError] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  const [groupModalVisible, setGroupModalVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listFriends(), listGroups(), listIncomingGroupInvites()])
      .then(([friendsResult, groupsResult, invitesResult]) => {
        if (cancelled) return;
        setFriendState(friendsResult);
        setGroups(groupsResult.groups);
        setGroupInvites(invitesResult.invites);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "No se pudo cargar la seccion Social.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setFriendState(await acceptFriendRequest(requestId));
    } catch (err) {
      setFriendError(err instanceof Error ? err.message : "No se pudo aceptar la solicitud.");
    }
  }

  async function handleRejectRequest(requestId: string) {
    try {
      setFriendState(await rejectFriendRequest(requestId));
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
      setGroupInvites((current) => current.filter((item) => item.id !== invite.id));
      const groupsResult = await listGroups();
      setGroups(groupsResult.groups);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo aceptar la invitacion.");
    }
  }

  async function handleRejectGroupInvite(invite: IncomingGroupInvite) {
    try {
      await rejectGroupInvite(invite.id);
      setGroupInvites((current) => current.filter((item) => item.id !== invite.id));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo rechazar la invitacion.");
    }
  }

  async function handleCreateGroup(name: string) {
    const group = await createGroup(name);
    setGroups((current) => [
      ...current,
      { id: group.id, name: group.name, ownerAccountId: group.ownerAccountId, memberCount: group.members.length, createdAt: group.createdAt },
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
      <Text style={styles.pageLabel}>Social</Text>

      {loadError ? <Text style={styles.loadErrorText}>{loadError}</Text> : null}

      {groupInvites.length > 0 ? (
        <SectionCard title="Invitaciones a grupos" subtitle="Acepta o rechaza invitaciones pendientes">
          {groupInvites.map((invite) => (
            <View key={invite.id} style={styles.requestRow}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{invite.groupName}</Text>
                <Text style={styles.requestMeta}>Invitado por {invite.inviterDisplayName}</Text>
              </View>
              <View style={styles.requestActions}>
                <Pressable style={styles.acceptButton} onPress={() => handleAcceptGroupInvite(invite)}>
                  <Text style={styles.acceptButtonText}>Aceptar</Text>
                </Pressable>
                <Pressable style={styles.rejectButton} onPress={() => handleRejectGroupInvite(invite)}>
                  <Text style={styles.rejectButtonText}>Rechazar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard title="Grupos de predicciones" subtitle="Compite con tus amigos en espacios de grupo">
        <View style={styles.groupList}>
          {groups.length > 0 ? (
            groups.map((group) => (
              <GroupCard
                key={group.id}
                name={group.name}
                memberCount={group.memberCount}
                onPress={() => router.push(`/groups/${group.id}`)}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>Aun no tienes grupos de predicciones.</Text>
          )}
        </View>
        <Pressable style={styles.createGroupButton} onPress={() => setGroupModalVisible(true)}>
          <Text style={styles.createGroupText}>+ Crear grupo</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="Amigos" subtitle="Envia una solicitud por identificador de cuenta; el otro usuario debe aceptarla">
        <View style={styles.addFriendRow}>
          <TextInput
            style={styles.addFriendInput}
            placeholder="Identificador de cuenta"
            placeholderTextColor={colors.muted}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
          />
          <Pressable style={styles.addFriendButton} onPress={handleSendRequest} disabled={sendingRequest}>
            <Text style={styles.addFriendButtonText}>{sendingRequest ? "Enviando..." : "Enviar solicitud"}</Text>
          </Pressable>
        </View>
        {friendError ? <Text style={styles.friendErrorText}>{friendError}</Text> : null}

        {friendState.incomingRequests.length > 0 ? (
          <View style={styles.requestGroup}>
            <Text style={styles.requestGroupTitle}>Solicitudes recibidas</Text>
            {friendState.incomingRequests.map((request: FriendRequest) => (
              <View key={request.id} style={styles.requestRow}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{request.displayName}</Text>
                  <Text style={styles.requestMeta}>Elo {request.elo}</Text>
                </View>
                <View style={styles.requestActions}>
                  <Pressable style={styles.acceptButton} onPress={() => handleAcceptRequest(request.id)}>
                    <Text style={styles.acceptButtonText}>Aceptar</Text>
                  </Pressable>
                  <Pressable style={styles.rejectButton} onPress={() => handleRejectRequest(request.id)}>
                    <Text style={styles.rejectButtonText}>Rechazar</Text>
                  </Pressable>
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
              displayName={friend.displayName}
              avatarUrl={friend.avatarUrl}
              elo={friend.elo}
              onRemove={() => handleRemoveFriend(friend.accountId)}
            />
          ))
        ) : (
          <EmptyFriends />
        )}
      </SectionCard>

      <CreateGroupModal visible={groupModalVisible} onClose={() => setGroupModalVisible(false)} onCreate={handleCreateGroup} />
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
  pageLabel: {
    color: colors.primaryDark,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  loadErrorText: {
    color: colors.danger,
  },
  groupList: {
    gap: spacing.sm,
  },
  createGroupButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primary,
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
