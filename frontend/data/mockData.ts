export type MockEvent = {
  id: string;
  title: string;
  sport: string;
  league: string;
  startLabel: string;
  featured: boolean;
  tone: string;
};

export type MockProfile = {
  id: string;
  displayName: string;
  avatarUrl: string;
  elo: number;
  beths: number;
  bethsLastGrantAt: string;
  rankLabel: string;
  winRate: string;
  streak: string;
  bio: string;
  eloBetsSettled: number;
  eloBetsCountedToday: number;
  eloBetsCountedDate: string;
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

export const mockProfile: MockProfile = {
  id: "profile-1",
  displayName: "bethany_fox",
  avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop",
  elo: 1768,
  beths: 500,
  bethsLastGrantAt: "",
  rankLabel: "Prediction Captain",
  winRate: "68% win rate",
  streak: "5 wins in a row",
  bio: "Competitive predictor with a sharp eye for football, tennis, and esports.",
  eloBetsSettled: 0,
  eloBetsCountedToday: 0,
  eloBetsCountedDate: "",
};

