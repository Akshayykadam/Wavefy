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
  Animated,
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

  const animatedWidth = React.useRef(new Animated.Value(0)).current;
  const lastAnimatedPerc = React.useRef(-1);

  React.useEffect(() => {
    const progressPerc = duration > 0 ? (position / duration) * 100 : 0;
    // Only animate when progress changes by at least 0.5% — avoids animation on every tick
    if (Math.abs(progressPerc - lastAnimatedPerc.current) < 0.5) return;
    lastAnimatedPerc.current = progressPerc;
    Animated.timing(animatedWidth, {
      toValue: progressPerc,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [position, duration]);

  if (!currentEpisode || !currentPodcast) {
    return null;
  }

  const isTabsScreen = segments[0] === '(tabs)';
  if ((segments as string[]).includes('player') || currentEpisode?.id === 'hidden') {
    return null;
  }

  // Match the actual tab bar heights from (tabs)/_layout.tsx
  const actualTabBarHeight = Platform.OS === 'ios'
    ? 54 + Math.max(insets.bottom, 10)   // iOS: height = 54 + max(bottom, 10)
    : 60 + (insets.bottom > 0 ? insets.bottom : 8);  // Android: minHeight = 60 + bottom

  // Place mini player 8px above the tab bar (or 8px from safe area on non-tab screens)
  const bottomPosition = isTabsScreen ? actualTabBarHeight + 8 : insets.bottom + 8;

  return (
    <Pressable
      style={[styles.container, { bottom: bottomPosition }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/player");
      }}
    >

      {/* Blur background */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={100}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {/* Dark overlay to reduce transparency, solid surface for Android */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? 'rgba(10,10,10,0.78)' : Colors.surface }]} />
      
      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBar, { width: animatedWidth.interpolate({
          inputRange: [0, 100],
          outputRange: ['0%', '100%']
        }) }]} />
      </View>

      <View style={styles.content}>
        {/* Artwork with glow */}
        <View style={styles.artworkWrapper}>
          <Image
            source={{ uri: currentPodcast.artworkUrl600 }}
            style={styles.artwork}
            contentFit="cover"
            transition={200}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1} textBreakStrategy="simple">
            {currentEpisode.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1} textBreakStrategy="simple">
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
    left: 10,
    right: 10,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.whiteAlpha10,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: Colors.progressBg,
    zIndex: 10,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  artworkWrapper: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  artwork: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.primaryText,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: "center",
    alignItems: "center",
  },
});
