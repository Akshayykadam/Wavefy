import { useRouter, useSegments } from "expo-router";
import { Play, Pause } from "lucide-react-native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { usePlayer } from "@/contexts/PlayerContext";

export default function MiniPlayer() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { currentEpisode, currentPodcast, isPlaying, togglePlayPause, isLoading } = usePlayer();

  if (!currentEpisode || !currentPodcast) {
    return null;
  }

  // Check if we are on a tab screen to offset the mini player
  const isTabsScreen = segments[0] === '(tabs)';
  if ((segments as string[]).includes('player') || currentEpisode?.id === 'hidden') {
    return null;
  }

  const TAB_BAR_HEIGHT = 49;

  // Position at the bottom with safe area inset, plus tab bar height if visible
  const bottomPosition = insets.bottom + (isTabsScreen ? TAB_BAR_HEIGHT : 0) + 12; // +12 for floating margin

  return (
    <Pressable
      style={[styles.container, { bottom: bottomPosition }]}
      onPress={() => router.push("/player")}
    >


      <View style={styles.content}>
        <Image
          source={{ uri: currentPodcast.artworkUrl600 }}
          style={styles.artwork}
          contentFit="cover"
        />

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentEpisode.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {currentPodcast.collectionName}
          </Text>
        </View>

        <Pressable
          style={styles.playButton}
          onPress={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primaryText} />
          ) : isPlaying ? (
            <Pause color={Colors.primaryText} size={24} fill={Colors.primaryText} />
          ) : (
            <Play color={Colors.primaryText} size={24} fill={Colors.primaryText} />
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Android shadow
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 24, // Circular
    backgroundColor: Colors.black,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primaryText,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  playButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
