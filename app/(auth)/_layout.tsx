import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/ui";

export default function AuthLayout() {
  const { session } = useAuth();
  const { colors } = useTheme();

  if (session !== null) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
