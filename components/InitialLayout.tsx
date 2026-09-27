import { useConvexAuth } from "@convex-dev/auth/react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

export default function InitialLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = (segments[0] as string) === "(auth)";

    if (isAuthenticated) {
      if (inAuthScreen) {
        router.replace("/(app)" as any);
      }
    } else {
      if (!inAuthScreen) {
        router.replace("/(auth)/login" as any);
      }
    }

    SplashScreen.hideAsync();
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
