import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listMyChallenges } from "../data/challenges";
import { GroupSummary, listFriends, listGroups, listIncomingGroupInvites } from "../data/social";
import { useAuth } from "./AuthContext";

type SocialNotificationsValue = {
  hasFriendRequests: boolean;
  hasGroupInvites: boolean;
  hasNotifications: boolean;
  friendRequestCount: number;
  groupInviteCount: number;
  challengeCount: number;
  groupsWithUpdate: string[];
  hasGroupUpdate: (groupId: string) => boolean;
  refresh: () => Promise<void>;
  setFriendRequestCount: (count: number) => void;
  setGroupInviteCount: (count: number) => void;
  setChallengeCount: (count: number) => void;
  syncGroups: (groups: GroupSummary[]) => void;
  clearGroupUpdate: (groupId: string) => void;
};

const SocialNotificationsContext = createContext<SocialNotificationsValue | undefined>(undefined);

export function SocialNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [groupInviteCount, setGroupInviteCount] = useState(0);
  const [challengeCount, setChallengeCount] = useState(0);
  const [groupsWithUpdate, setGroupsWithUpdate] = useState<string[]>([]);

  const syncGroups = useCallback((groups: GroupSummary[]) => {
    setGroupsWithUpdate(groups.filter((group) => group.hasUpdate).map((group) => group.id));
  }, []);

  const refresh = useCallback(async () => {
    const [friendState, groupsResult, invitesResult, challengesResult] = await Promise.all([
      listFriends(),
      listGroups(),
      listIncomingGroupInvites(),
      listMyChallenges(),
    ]);
    setFriendRequestCount(friendState.incomingRequests.length);
    setGroupInviteCount(invitesResult.invites.length);
    setChallengeCount(challengesResult.incoming.length);
    syncGroups(groupsResult.groups);
  }, [syncGroups]);

  useEffect(() => {
    if (!isAuthenticated) {
      setFriendRequestCount(0);
      setGroupInviteCount(0);
      setChallengeCount(0);
      setGroupsWithUpdate([]);
      return;
    }
    refresh().catch(() => {
      // Silently ignore: the badge is a non-critical indicator, screens surface their own load errors.
    });
  }, [isAuthenticated, refresh]);

  const clearGroupUpdate = useCallback((groupId: string) => {
    setGroupsWithUpdate((current) => current.filter((id) => id !== groupId));
  }, []);

  const value = useMemo<SocialNotificationsValue>(
    () => ({
      hasFriendRequests: friendRequestCount > 0,
      hasGroupInvites: groupInviteCount > 0,
      hasNotifications: friendRequestCount > 0 || groupInviteCount > 0 || challengeCount > 0 || groupsWithUpdate.length > 0,
      friendRequestCount,
      groupInviteCount,
      challengeCount,
      groupsWithUpdate,
      hasGroupUpdate: (groupId: string) => groupsWithUpdate.includes(groupId),
      refresh,
      setFriendRequestCount,
      setGroupInviteCount,
      setChallengeCount,
      syncGroups,
      clearGroupUpdate,
    }),
    [friendRequestCount, groupInviteCount, challengeCount, groupsWithUpdate, refresh, syncGroups, clearGroupUpdate],
  );

  return <SocialNotificationsContext.Provider value={value}>{children}</SocialNotificationsContext.Provider>;
}

export function useSocialNotifications() {
  const context = useContext(SocialNotificationsContext);
  if (!context) {
    throw new Error("useSocialNotifications must be used within SocialNotificationsProvider");
  }
  return context;
}
