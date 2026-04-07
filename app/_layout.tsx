import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { FollowedPodcastsProvider } from "@/contexts/FollowedPodcastsContext";
import { LikedEpisodesProvider } from "@/contexts/LikedEpisodesContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PlaylistProvider } from "@/contexts/PlaylistContext";
import { RecommendationProvider } from "@/contexts/RecommendationContext";
import MiniPlayer from "@/components/MiniPlayer";
import { DownloadProvider } from "@/contexts/DownloadContext";

// Import background task definitions so they're registered at module level
import '@/utils/backgroundNotifications';

// Service is now registered in index.js for reliable Headless JS support

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const notificationResponseListener = useRef<{ remove(): void } | null>(null);

  useEffect(() => {
    // Handle notification taps to navigate to the podcast
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.podcastId) {
          router.push(`/podcast/${data.podcastId}` as any);
        }
      }
    );

    return () => {
      notificationResponseListener.current?.remove();
    };
  }, [router]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="player"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom"
        }}
      />
      <Stack.Screen
        name="podcast/[id]"
        options={{
          headerShown: false,
          animation: "slide_from_right"
        }}
      />
      <Stack.Screen
        name="queue"
        options={{
          headerShown: false,
          animation: "slide_from_right"
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: false,
          animation: "slide_from_right"
        }}
      />
      <Stack.Screen
        name="playlist/[id]"
        options={{
          headerShown: false,
          animation: "slide_from_right"
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    async function prepare() {
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <FollowedPodcastsProvider>
          <LikedEpisodesProvider>
            <DownloadProvider>
              <PlayerProvider>
                <NotificationProvider>
                  <PlaylistProvider>
                    <RecommendationProvider>
                      <RootLayoutNav />
                      <MiniPlayer />
                    </RecommendationProvider>
                  </PlaylistProvider>
                </NotificationProvider>
              </PlayerProvider>
            </DownloadProvider>
          </LikedEpisodesProvider>
        </FollowedPodcastsProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
