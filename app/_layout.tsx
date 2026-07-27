import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { FollowedPodcastsProvider } from "@/contexts/FollowedPodcastsContext";
import { LikedEpisodesProvider } from "@/contexts/LikedEpisodesContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PlaylistProvider } from "@/contexts/PlaylistContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { AudioQualityProvider } from "@/contexts/AudioQualityContext";
import MiniPlayer from "@/components/MiniPlayer";
import OfflineBanner from "@/components/OfflineBanner";
import { DownloadProvider } from "@/contexts/DownloadContext";

// Import background task definitions so they're registered at module level
import '@/utils/backgroundNotifications';

// Service is now registered in index.js for reliable Headless JS support

SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = '@castbee_onboarding_complete';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 minutes — prevents refetch on every tab switch / mount
      gcTime: 1000 * 60 * 10,     // 10 minutes in cache
      retry: 1,
    },
  },
});

function RootLayoutNav() {
  const router = useRouter();
  const notificationResponseListener = useRef<{ remove(): void } | null>(null);
  const [isReady, setIsReady] = useState(false);

  const routerRef = React.useRef(router);
  React.useEffect(() => { routerRef.current = router; });

  useEffect(() => {
    // Check onboarding status on mount
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setIsReady(true);
      if (value !== 'true') {
        // Use setTimeout to ensure navigation happens after layout mount
        setTimeout(() => {
          routerRef.current.replace('/onboarding' as any);
        }, 100);
      }
    }).catch(() => {
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    // Handle notification taps to navigate to the podcast
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.podcastId) {
          routerRef.current.push(`/podcast/${data.podcastId}` as any);
        }
      }
    );

    return () => {
      notificationResponseListener.current?.remove();
    };
  }, []); // Empty deps — listener registered once, router accessed via ref

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false,
          animation: "none",
          gestureEnabled: false,
        }}
      />
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
      <Stack.Screen
        name="settings"
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
        <NetworkProvider>
          <AudioQualityProvider>
            <FollowedPodcastsProvider>
              <LikedEpisodesProvider>
                <DownloadProvider>
                  <PlayerProvider>
                    <NotificationProvider>
                      <PlaylistProvider>
                        <RootLayoutNav />
                        <MiniPlayer />
                        <OfflineBanner />
                      </PlaylistProvider>
                    </NotificationProvider>
                  </PlayerProvider>
                </DownloadProvider>
              </LikedEpisodesProvider>
            </FollowedPodcastsProvider>
          </AudioQualityProvider>
        </NetworkProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

