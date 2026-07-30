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

