import { useRouter } from "expo-router";
import {
  ChevronDown,
  Heart,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  RotateCw,
  Download,
  Check,
  MoreVertical,
  X,
  Clock,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  UIManager,
  LayoutAnimation,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Slider from "@react-native-community/slider";
import Colors from "@/constants/colors";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLikedEpisodes } from "@/contexts/LikedEpisodesContext";
import { useDownloads } from "@/contexts/DownloadContext";

const { width } = Dimensions.get("window");

const formatTime = (millis: number): string => {
  const totalSeconds = Math.floor(millis / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function PlayerScreen() {
  const router = useRouter();
  const {
    currentEpisode,
    currentPodcast,
    isPlaying,
    isLoading,
    position,
    duration,
    playbackRate,
    togglePlayPause,
    seekTo,
    skipForward,
    skipBackward,
    togglePlaybackSpeed,
    playNext,
    playPrevious,
    sleepTimer,
    startSleepTimer,
    changePlaybackRate,
  } = usePlayer();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const { isLiked, toggleLike } = useLikedEpisodes();
  const { isDownloaded, getDownloadProgress, downloadEpisode, deleteDownload } = useDownloads();

  const toggleDescription = () => {
    // Enable LayoutAnimation for Android
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback to home/library if no history (e.g. after deep link or reload)
      router.replace("/(tabs)");
    }
  };

  if (!currentEpisode || !currentPodcast) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable onPress={handleBack}>
              <ChevronDown color={Colors.primaryText} size={32} />
            </Pressable>
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No episode playing</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const currentPosition = isSeeking ? seekPosition : position;
  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={handleBack}>
            <ChevronDown color={Colors.primaryText} size={32} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Now Playing
          </Text>
          <Pressable onPress={() => toggleLike({
            ...currentEpisode,
            artwork: currentEpisode.artwork || currentPodcast.artworkUrl600,
            podcastTitle: currentPodcast.collectionName,
            artistName: currentPodcast.artistName,
          })} style={{ padding: 8 }}>
            <Heart
              color={isLiked(currentEpisode.id) ? Colors.accent : Colors.primaryText}
              size={24}
              fill={isLiked(currentEpisode.id) ? Colors.accent : "transparent"}
            />
          </Pressable>
          <Pressable onPress={() => setMenuVisible(true)} style={{ padding: 8, marginRight: -8 }}>
            <MoreVertical color={Colors.primaryText} size={24} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.artworkContainer}>
            <Image
              source={{ uri: currentPodcast.artworkUrl600 }}
              style={styles.artwork}
              contentFit="cover"
            />
          </View>

          <View style={styles.info}>
            <Text style={styles.episodeTitle} numberOfLines={2}>
              {currentEpisode.title}
            </Text>
            <Pressable onPress={() => {
              if (currentPodcast?.collectionId) {
                router.push(`/podcast/${currentPodcast.collectionId}`);
              }
            }}>
              <Text style={styles.podcastName} numberOfLines={1}>
                {currentPodcast.collectionName}
              </Text>
            </Pressable>
          </View>

          <View style={styles.progressContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 0.001} // Prevent 0 maximumValue which might cause crash if min is also 0
              value={currentPosition}
              onValueChange={(value: number) => {
                setIsSeeking(true);
                setSeekPosition(value);
              }}
              onSlidingComplete={(value: number) => {
                setIsSeeking(false);
                seekTo(value);
              }}
              minimumTrackTintColor={Colors.accent}
              maximumTrackTintColor={Colors.border}
              thumbTintColor={Colors.accent}
            />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <Pressable onPress={skipBackward}>
              <RotateCcw color={Colors.primaryText} size={28} />
              <Text style={styles.skipText}>10</Text>
            </Pressable>

            <Pressable onPress={playPrevious}>
              <SkipBack color={Colors.primaryText} size={36} />
            </Pressable>

            <Pressable style={styles.playButton} onPress={togglePlayPause}>
              {isLoading ? (
                <ActivityIndicator size="large" color={Colors.black} />
              ) : isPlaying ? (
                <Pause
                  color={Colors.black}
                  size={36}
                  fill={Colors.black}
                />
              ) : (
                <Play color={Colors.black} size={36} fill={Colors.black} />
              )}
            </Pressable>

            <Pressable onPress={playNext}>
              <SkipForward color={Colors.primaryText} size={36} />
            </Pressable>

            <Pressable onPress={skipForward}>
              <RotateCw color={Colors.primaryText} size={28} />
              <Text style={styles.skipText}>10</Text>
            </Pressable>
          </View>



          {currentEpisode.description && (
            <Pressable style={styles.description} onPress={toggleDescription}>
              <View style={styles.descriptionHeader}>
                <Text style={styles.descriptionTitle}>About this episode</Text>
                <ChevronDown
                  color={Colors.secondaryText}
                  size={20}
                  style={{ transform: [{ rotate: isDescriptionExpanded ? '180deg' : '0deg' }] }}
                />
              </View>
              <Text
                style={styles.descriptionText}
                numberOfLines={isDescriptionExpanded ? undefined : 3}
              >
                {currentEpisode.description}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContent}>
          <View style={styles.dragHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>More Options</Text>
            <Pressable
              onPress={() => setMenuVisible(false)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <X color={Colors.primaryText} size={20} />
            </Pressable>
          </View>

          {/* Sleep Timer */}
          <View style={styles.menuSection}>
            <View style={styles.menuLabelRow}>
              <Clock size={16} color={Colors.secondaryText} style={{ marginRight: 6 }} />
              <Text style={styles.menuLabel}>Sleep Timer</Text>
              {sleepTimer && <Text style={styles.activeLabel}>{sleepTimer}m</Text>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {[15, 30, 45, 60].map(min => (
                <Pressable
                  key={min}
                  style={({ pressed }) => [
                    styles.chip,
                    sleepTimer === min && styles.chipActive,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => startSleepTimer(min)}
                >
                  <Text style={[styles.chipText, sleepTimer === min && styles.chipTextActive]}>{min}m</Text>
                </Pressable>
              ))}
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  !sleepTimer && styles.chipActive,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => startSleepTimer(0)}
              >
                <Text style={[styles.chipText, !sleepTimer && styles.chipTextActive]}>Off</Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* Playback Speed */}
          <View style={styles.menuSection}>
            <Text style={[styles.menuLabel, { marginBottom: 10 }]}>Playback Speed</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {[0.5, 0.8, 1.0, 1.2, 1.5, 2.0].map(speed => (
                <Pressable
                  key={speed}
                  style={({ pressed }) => [
                    styles.chip,
                    playbackRate === speed && styles.chipActive,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => changePlaybackRate(speed)}
                >
                  <Text style={[styles.chipText, playbackRate === speed && styles.chipTextActive]}>{speed}x</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Download */}
          <View style={styles.menuSection}>
            <Text style={[styles.menuLabel, { marginBottom: 10 }]}>Download</Text>
            <Pressable
              style={({ pressed }) => [styles.menuButton, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => {
                if (isDownloaded(currentEpisode.id)) {
                  deleteDownload(currentEpisode.id);
                } else if (getDownloadProgress(currentEpisode.id) === 0) {
                  downloadEpisode(currentEpisode, currentPodcast);
                }
              }}
            >
              {getDownloadProgress(currentEpisode.id) > 0 && getDownloadProgress(currentEpisode.id) < 100 ? (
                <>
                  <ActivityIndicator size="small" color={Colors.primaryText} style={{ marginRight: 8 }} />
                  <Text style={styles.menuButtonText}>Downloading...</Text>
                </>
              ) : isDownloaded(currentEpisode.id) ? (
                <>
                  <Check color={Colors.accent} size={16} style={{ marginRight: 8 }} />
                  <Text style={[styles.menuButtonText, { color: Colors.accent }]}>Downloaded</Text>
                </>
              ) : (
                <>
                  <Download color={Colors.primaryText} size={16} style={{ marginRight: 8 }} />
                  <Text style={styles.menuButtonText}>Download Episode</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primaryText,
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120, // Increased to ensure description is fully visible
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: Colors.secondaryText,
  },
  artworkContainer: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 40,
  },
  artwork: {
    width: width - 80,
    height: width - 80,
    borderRadius: 16,
    backgroundColor: Colors.cardBg,
  },
  info: {
    marginBottom: 40,
  },
  episodeTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.primaryText,
    textAlign: "center",
    marginBottom: 8,
  },
  podcastName: {
    fontSize: 16,
    color: Colors.secondaryText,
    textAlign: "center",
  },
  progressContainer: {
    marginBottom: 24,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryText,
    justifyContent: "center",
    alignItems: "center",
  },

  speedText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.primaryText,
  },
  description: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.primaryText,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.secondaryText,
    lineHeight: 20,
  },
  skipText: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.primaryText,
    top: 9,
    left: 9, // Adjust based on icon size and desired centering
  },
  downloadButtonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    minWidth: 140,
    justifyContent: 'center',
  },
  downloadButtonText: {
    color: Colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24, // Increased spacing
  },
  modalTitle: {
    fontSize: 20,  // Increased from 18
    fontWeight: '700', // Bolder
    color: Colors.primaryText,
  },
  menuSection: {
    marginBottom: 16,
  },
  menuLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16, // Increased from 12
  },
  menuLabel: {
    fontSize: 16, // Increased from 14
    color: Colors.primaryText,
    fontWeight: '600', // Bolder
  },
  activeLabel: {
    fontSize: 14, // Increased from 12
    color: Colors.accent,
    fontWeight: '500',
    marginLeft: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 12, // Increased gap
    flexWrap: 'wrap', // Allow wrap if needed on small screens, though usually row is fine
  },
  chip: {
    paddingHorizontal: 16, // Increased from 12
    paddingVertical: 10,   // Increased from 6
    borderRadius: 20,      // Increased form 16
    backgroundColor: Colors.secondaryText + '33',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipText: {
    color: Colors.primaryText,
    fontSize: 14, // Increased from 12
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#000',
  },
  speedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.border,
    padding: 16, // Increased from 12
    borderRadius: 16, // Increased radius
    justifyContent: 'center',
    marginTop: 8,
  },
  menuButtonText: {
    color: Colors.primaryText,
    fontSize: 16, // Increased from 14
    fontWeight: '600',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.secondaryText,
    opacity: 0.3,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
});
