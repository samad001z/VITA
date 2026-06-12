import "../global.css";
// Side effect: defines the background health-sync task at module scope.
import "@/lib/health/backgroundTask";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { CrashScreen } from "@/components/CrashScreen";
import { LaunchOverlay, LaunchProvider } from "@/components/LaunchSequence";
import { initI18n } from "@/i18n";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { SheetProvider, SheetStage, ThemeProvider, useTheme } from "@/ui";

void SplashScreen.preventAutoHideAsync();

// Any uncaught render error below the root lands on the branded crash
// screen with a reload action instead of a frozen tree.
export { CrashScreen as ErrorBoundary };

function RootNavigator() {
  const { isLoading } = useAuth();
  const { colors } = useTheme();
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    void initI18n().then(() => setI18nReady(true));
  }, []);

  const ready = fontsLoaded && !isLoading && i18nReady;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          animationDuration: 200,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        {/* Reports rise from below like a sheet of paper being handed over. */}
        <Stack.Screen
          name="report/[id]"
          options={{ animation: "slide_from_bottom", gestureEnabled: true }}
        />
      </Stack>
      {/* Cold-start brand moment; sits above the navigator until it dissolves. */}
      <LaunchOverlay />
    </View>
  );
}

function ThemedShell() {
  const { colors, scheme } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AuthProvider>
        <SheetProvider>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <SheetStage>
            <RootNavigator />
          </SheetStage>
        </SheetProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LaunchProvider>
        <ThemedShell />
      </LaunchProvider>
    </ThemeProvider>
  );
}
