export type MockEvent = {
  id: string;
  title: string;
  sport: string;
  league: string;
  startLabel: string;
  featured: boolean;
  tone: string;
};

export type RankingEntry = {
  id: string;
  position: number;
  displayName: string;
  elo: number;
  trend: "up" | "down" | "stable";
  badge: string;
};

export type MockProfile = {
  id: string;
  displayName: string;
  avatarUrl: string;
  elo: number;
  rankLabel: string;
  winRate: string;
  streak: string;
  bio: string;
};

export type PredictionGroup = {
  id: string;
  name: string;
  memberCount: number;
  ownerName: string;
  lastActivityLabel: string;
  score: number;
};

export type Friend = {
  id: string;
  name: string;
  avatarUrl: string;
  sportFocus: string;
  status: string;
  isSelected: boolean;
};

export const mockEvents: MockEvent[] = [
  {
    id: "event-1",
    title: "Real Madrid vs Barcelona",
    sport: "Football",
    league: "LaLiga",
    startLabel: "Tonight 21:00",
    featured: true,
    tone: "sunset",
  },
  {
    id: "event-2",
    title: "Carlos Alcaraz v Sinner",
    sport: "Tennis",
    league: "ATP Wimbledon",
    startLabel: "Tomorrow 18:30",
    featured: true,
    tone: "coral",
  },
  {
    id: "event-3",
    title: "Lakers vs Celtics",
    sport: "Basketball",
    league: "NBA Finals",
    startLabel: "Friday 02:00",
    featured: true,
    tone: "amber",
  },
  {
    id: "event-4",
    title: "Formula 1 - Monaco GP",
    sport: "Motorsport",
    league: "Moto GP",
    startLabel: "Sunday 15:00",
    featured: false,
    tone: "gold",
  },
  {
    id: "event-5",
    title: "Spain vs Brazil U20",
    sport: "Football",
    league: "Mundial 2026",
    startLabel: "Today 19:45",
    featured: false,
    tone: "peach",
  },
  {
    id: "event-6",
    title: "PSG vs Bayern",
    sport: "Football",
    league: "Champions",
    startLabel: "Wednesday 20:45",
    featured: true,
    tone: "electric",
  },
  {
    id: "event-7",
    title: "Juventus vs Inter",
    sport: "Football",
    league: "LaLiga",
    startLabel: "Saturday 22:00",
    featured: false,
    tone: "frost",
  },
  {
    id: "event-8",
    title: "Marquez vs Bagnaia",
    sport: "Motorsport",
    league: "Moto GP",
    startLabel: "Sunday 13:00",
    featured: true,
    tone: "fire",
  },
];

export const globalRanking: RankingEntry[] = [
  { id: "rank-1", position: 1, displayName: "Luna", elo: 1842, trend: "up", badge: "Hot streak" },
  { id: "rank-2", position: 2, displayName: "Maks", elo: 1810, trend: "stable", badge: "All-rounder" },
  { id: "rank-3", position: 3, displayName: "BethAny", elo: 1796, trend: "up", badge: "Climbing" },
  { id: "rank-4", position: 4, displayName: "Nina", elo: 1764, trend: "down", badge: "Top 5" },
];

export const mockProfile: MockProfile = {
  id: "profile-1",
  displayName: "bethany_fox",
  avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop",
  elo: 1768,
  rankLabel: "Prediction Captain",
  winRate: "68% win rate",
  streak: "5 wins in a row",
  bio: "Competitive predictor with a sharp eye for football, tennis, and esports.",
};

export const predictionGroups: PredictionGroup[] = [
  {
    id: "group-1",
    name: "Friday Legends",
    memberCount: 8,
    ownerName: "Marta",
    lastActivityLabel: "New picks for tonight",
    score: 128,
  },
  {
    id: "group-2",
    name: "LaLiga Crew",
    memberCount: 6,
    ownerName: "Alex",
    lastActivityLabel: "3 friends joined today",
    score: 112,
  },
  {
    id: "group-3",
    name: "Rising Stars",
    memberCount: 5,
    ownerName: "Javi",
    lastActivityLabel: "Awaiting weekend picks",
    score: 97,
  },
];

export const mockFriends: Friend[] = [
  { id: "friend-1", name: "Marta Ruiz", avatarUrl: "https://i.pravatar.cc/150?img=32", sportFocus: "Football", status: "online", isSelected: true },
  { id: "friend-2", name: "Alex Vega", avatarUrl: "https://i.pravatar.cc/150?img=47", sportFocus: "Basketball", status: "busy", isSelected: true },
  { id: "friend-3", name: "Nerea Polo", avatarUrl: "https://i.pravatar.cc/150?img=12", sportFocus: "Tennis", status: "online", isSelected: false },
  { id: "friend-4", name: "Sergio León", avatarUrl: "https://i.pravatar.cc/150?img=15", sportFocus: "Esports", status: "inactive", isSelected: false },
];
