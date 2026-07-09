import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../components/AuthContext";
import { FriendRow } from "../../components/FriendRow";
import { GroupCard } from "../../components/GroupCard";
import { SectionCard } from "../../components/SectionCard";
import { colors, radii, spacing } from "../../theme";
import { mockFriends, predictionGroups } from "../../data";

export default function SocialScreen() {
  const { account, updateAccount } = useAuth();
  const friends = account?.friends ?? mockFriends;

  const selectedFriends = useMemo(() => friends.filter((friend) => friend.isSelected), [friends]);

  const toggleFriend = async (id: string) => {
    if (!account) return;
    const nextFriends = friends.map((friend) => (friend.id === id ? { ...friend, isSelected: !friend.isSelected } : friend));
    await updateAccount({ friends: nextFriends });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.pageLabel}>Social</Text>

      <SectionCard title="Prediction groups" subtitle="Compete with friends in mock group spaces">
        <View style={styles.groupList}>
          {predictionGroups.map((group) => (
            <GroupCard key={group.id} {...group} />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Friends" subtitle="Add or remove people inside the current session">
        {selectedFriends.length > 0 ? (
          selectedFriends.map((friend) => (
            <FriendRow
              key={friend.id}
              {...friend}
              onToggle={() => toggleFriend(friend.id)}
            />
          ))
        ) : (
          <EmptyFriends />
        )}
      </SectionCard>

      <SectionCard title="Suggested friends" subtitle="Available to add in the mock state">
        {friends.map((friend) => (
          <FriendRow
            key={friend.id}
            {...friend}
            selected={friend.isSelected}
            onToggle={() => toggleFriend(friend.id)}
          />
        ))}
      </SectionCard>
    </ScrollView>
  );
}

function EmptyFriends() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No friends added yet</Text>
      <Text style={styles.emptyText}>Tap a suggested friend below to build your prediction circles.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
  groupList: {
    gap: spacing.sm,
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
