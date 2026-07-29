import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "./Icon";
import { Tappable } from "./Tappable";
import { ActivityEvent, ActivityKind } from "../data/activity";
import { colors, radii, spacing } from "../theme";

const KIND_META: Record<ActivityKind, { icon: string; color: string }> = {
  milestone: { icon: "medal", color: colors.gold },
  challenge_won: { icon: "swords", color: colors.pink },
  bet_won: { icon: "bets", color: colors.accent },
  prediction_resolved: { icon: "target", color: colors.sky },
};

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  const weeks = Math.floor(days / 7);
  return `hace ${weeks} sem`;
}

type ActivityFeedProps = {
  events: ActivityEvent[];
  emptyLabel?: string;
};

export function ActivityFeed({ events, emptyLabel = "Sin actividad reciente." }: ActivityFeedProps) {
  const router = useRouter();

  if (events.length === 0) {
    return <Text style={styles.emptyText}>{emptyLabel}</Text>;
  }

  return (
    <View style={styles.list}>
      {events.map((event, index) => {
        const meta = KIND_META[event.kind];
        const isLast = index === events.length - 1;
        return (
          <Tappable
            key={event.id}
            onPress={() => router.push(`/profile/${event.accountId}`)}
            style={[styles.row, isLast ? styles.rowLast : null]}
          >
            <View style={[styles.iconBadge, { backgroundColor: `${meta.color}26`, borderColor: meta.color }]}>
              <Icon glyph={meta.icon} size={15} color={meta.color} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={2}>
                {event.isSelf ? event.title : `${event.displayName}: ${event.title.charAt(0).toLowerCase()}${event.title.slice(1)}`}
              </Text>
              {event.detail ? (
                <Text style={styles.detail} numberOfLines={1}>
                  {event.detail}
                </Text>
              ) : null}
              <Text style={styles.time}>{timeAgo(event.occurredAt)}</Text>
            </View>
          </Tappable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {},
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  detail: {
    color: colors.muted,
    fontSize: 12,
  },
  time: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: colors.muted,
  },
});
