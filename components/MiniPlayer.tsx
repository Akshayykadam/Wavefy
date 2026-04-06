import { useRouter, useSegments } from "expo-router";
import { Play, Pause, SkipForward } from "lucide-react-native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { usePlayer } from "@/contexts/PlayerContext";

export default function MiniPlayer() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const {
    currentEpisode,
    currentPodcast,
    isPlaying,
    togglePlayPause,
    isLoading,
    position,
    duration,
    skipForward,
  } = usePlayer();

  if (!currentEpisode || !currentPodcast) {
    return null;
  }

  const isTabsScreen = segments[0] === '(tabs)';
  if ((segments as string[]).includes('player') || currentEpisode?.id === 'hidden') {
    return null;
  }

  const TAB_BAR_HEIGHT = 49;
  const bottomPosition = insets.bottom + (isTabsScreen ? TAB_BAR_HEIGHT : 0) + 8;
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <Pressable
      style={[styles.container, { bottom: bottomPosition }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/player");
      }}
    >
      {/* Progress bar at top */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>

      {/* Blur background */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={100}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {/* Dark overlay to reduce transparency, solid surface for Android */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? 'rgba(12,12,12,0.75)' : Colors.surface }]} />

      <View style={styles.content}>
        {/* Artwork with glow */}
        <View style={styles.artworkWrapper}>
          <Image
            source={{ uri: currentPodcast.artworkUrl600 }}
            style={styles.artwork}
            contentFit="cover"
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentEpisode.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {currentPodcast.collectionName}
          </Text>
        </View>

        {/* Skip forward button */}
        <Pressable
          style={styles.controlButton}
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            skipForward();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <SkipForward color={Colors.secondaryText} size={20} fill={Colors.secondaryText} />
        </Pressable>

        {/* Play/Pause button */}
        <Pressable
          style={styles.playButton}
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            togglePlayPause();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primaryText} />
          ) : isPlaying ? (
            <Pause color={Colors.primaryText} size={22} fill={Colors.primaryText} />
          ) : (
            <Play color={Colors.primaryText} size={22} fill={Colors.primaryText} />
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 8,
    right: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha10,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.progressBg,
    zIndex: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  artworkWrapper: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primaryText,
    marginBottom: 1,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    letterSpacing: -0.1,
  },
  controlButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
});
