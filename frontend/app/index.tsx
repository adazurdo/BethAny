import { Redirect } from "expo-router";
import { useAuth } from "../components/AuthContext";

export default function Index() {
  const { isAuthenticated } = useAuth();
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)"} />;
}
