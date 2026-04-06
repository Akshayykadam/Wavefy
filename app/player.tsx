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
  ListMusic,
  Trash2,
  GripVertical,
} from "lucide-react-native";
import React, { useState, useRef } from "react";
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
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import Colors from "@/constants/colors";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLikedEpisodes } from "@/contexts/LikedEpisodesContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { Episode } from "@/types/podcast";
import WaveformSeekBar from "@/components/WaveformSeekBar";

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

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
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
    queue,
    setQueue,
    addToQueue,
    getHalfPlayedEpisodes,
    podcastEpisodes,
  } = usePlayer();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);
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

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  // Get upcoming episodes from same podcast for "Up Next" section
  const getUpNextEpisodes = (): Episode[] => {
    if (!currentEpisode || !podcastEpisodes || podcastEpisodes.length === 0) {
      return [];
    }

    const currentIndex = podcastEpisodes.findIndex(e => e.id === currentEpisode.id);
    if (currentIndex === -1) return podcastEpisodes.slice(0, 3);

    // Get next 3 episodes after current
    return podcastEpisodes.slice(currentIndex + 1, currentIndex + 4);
  };

  const halfPlayedEpisodes = getHalfPlayedEpisodes();
  const upNextEpisodes = getUpNextEpisodes();

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

  const renderQueueItem = ({ item, index }: { item: Episode; index: number }) => (
    <View style={styles.queueItem}>
      <View style={styles.queueItemLeft}>
        <GripVertical color={Colors.secondaryText} size={20} />
        <Image
          source={{ uri: item.artwork || currentPodcast?.artworkUrl600 }}
          style={styles.queueItemArtwork}
          contentFit="cover"
        />
        <View style={styles.queueItemInfo}>
          <Text style={styles.queueItemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.queueItemSubtitle} numberOfLines={1}>
            {item.podcastTitle || currentPodcast?.collectionName}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => removeFromQueue(index)}
        style={({ pressed }) => [styles.removeButton, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Trash2 color={Colors.accent} size={18} />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: currentPodcast.artworkUrl600 }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={Platform.OS === 'android' ? 30 : 0}
      />
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', Colors.black]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.4, 0.9]}
      />
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.headerButton}>
            <ChevronDown color={Colors.primaryText} size={32} />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Now Playing
          </Text>

          <View style={styles.headerRight}>
            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQueueVisible(true);
            }} style={styles.headerButton}>
              <ListMusic color={Colors.primaryText} size={24} />
              {queue.length > 0 && (
                <View style={styles.queueBadge}>
                  <Text style={styles.queueBadgeText}>{queue.length}</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleLike({
                ...currentEpisode,
                artwork: currentEpisode.artwork || currentPodcast.artworkUrl600,
                podcastTitle: currentPodcast.collectionName,
                artistName: currentPodcast.artistName,
              });
            }} style={styles.headerButton}>
              <Heart
                color={isLiked(currentEpisode.id) ? Colors.accent : Colors.primaryText}
                size={24}
                fill={isLiked(currentEpisode.id) ? Colors.accent : "transparent"}
              />
            </Pressable>
            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMenuVisible(true);
            }} style={styles.headerButton}>
              <MoreVertical color={Colors.primaryText} size={24} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.artworkContainer}>
            <View style={styles.artworkShadow}>
              <Image
                source={{ uri: currentPodcast.artworkUrl600 }}
                style={styles.artwork}
                contentFit="cover"
              />
            </View>
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
            <WaveformSeekBar
              progress={duration > 0 ? currentPosition / duration : 0}
              duration={duration}
              onSeek={(pos) => seekTo(pos)}
              height={50}
            />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <Pressable style={styles.skipButton} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              skipBackward();
            }}>
              <RotateCcw color={Colors.primaryText} size={26} />
              <Text style={styles.skipLabel}>10</Text>
            </Pressable>

            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              playPrevious();
            }}>
              <SkipBack color={Colors.primaryText} size={32} fill={Colors.primaryText} />
            </Pressable>

            <View style={styles.playButtonOuter}>
              <Pressable style={styles.playButton} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                togglePlayPause();
              }}>
                {isLoading ? (
                  <ActivityIndicator size="large" color={Colors.black} />
                ) : isPlaying ? (
                  <Pause color={Colors.black} size={32} fill={Colors.black} />
                ) : (
                  <Play color={Colors.black} size={32} fill={Colors.black} style={{ marginLeft: 3 }} />
                )}
              </Pressable>
            </View>

            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              playNext();
            }}>
              <SkipForward color={Colors.primaryText} size={32} fill={Colors.primaryText} />
            </Pressable>

            <Pressable style={styles.skipButton} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              skipForward();
            }}>
              <RotateCw color={Colors.primaryText} size={26} />
              <Text style={styles.skipLabel}>10</Text>
            </Pressable>
          </View>

          {/* Up Next Preview */}
          {(queue.length > 0 || upNextEpisodes.length > 0) && (
            <Pressable
              style={styles.upNextPreview}
              onPress={() => setQueueVisible(true)}
            >
              <View style={styles.upNextHeader}>
                <ListMusic color={Colors.primaryText} size={18} />
                <Text style={styles.upNextTitle}>Up Next</Text>
                <Text style={styles.upNextCount}>
                  {queue.length > 0 ? `${queue.length} in queue` : `${upNextEpisodes.length} more`}
                </Text>
              </View>
              {queue.length > 0 ? (
                <Text style={styles.upNextEpisode} numberOfLines={1}>
                  {queue[0].title}
                </Text>
              ) : upNextEpisodes.length > 0 ? (
                <Text style={styles.upNextEpisode} numberOfLines={1}>
                  {upNextEpisodes[0].title}
                </Text>
              ) : null}
            </Pressable>
          )}

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

      {/* Queue Modal */}
      <Modal
        visible={queueVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQueueVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setQueueVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.modalContent, styles.queueModalContent]}>
          <View style={styles.dragHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Queue</Text>
            <View style={styles.queueHeaderRight}>
              {queue.length > 0 && (
                <Pressable
                  onPress={clearQueue}
                  style={({ pressed }) => [styles.clearButton, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setQueueVisible(false)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginLeft: 16 })}
              >
                <X color={Colors.primaryText} size={20} />
              </Pressable>
            </View>
          </View>

          {/* Now Playing */}
          <View style={styles.nowPlayingSection}>
            <Text style={styles.queueSectionTitle}>Now Playing</Text>
            <View style={styles.nowPlayingItem}>
              <Image
                source={{ uri: currentPodcast.artworkUrl600 }}
                style={styles.nowPlayingArtwork}
                contentFit="cover"
              />
              <View style={styles.nowPlayingInfo}>
                <Text style={styles.nowPlayingTitle} numberOfLines={2}>
                  {currentEpisode.title}
                </Text>
                <Text style={styles.nowPlayingSubtitle} numberOfLines={1}>
                  {currentPodcast.collectionName}
                </Text>
              </View>
              {isPlaying ? (
                <View style={styles.playingIndicator}>
                  <View style={[styles.playingBar, styles.playingBar1]} />
                  <View style={[styles.playingBar, styles.playingBar2]} />
                  <View style={[styles.playingBar, styles.playingBar3]} />
                </View>
              ) : (
                <Pause color={Colors.accent} size={20} />
              )}
            </View>
          </View>

          {/* Queue */}
          {queue.length > 0 && (
            <View style={styles.queueSection}>
              <Text style={styles.queueSectionTitle}>Up Next ({queue.length})</Text>
              <FlatList
                data={queue}
                renderItem={renderQueueItem}
                keyExtractor={(item, index) => `queue-${item.id}-${index}`}
                style={styles.queueList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

          {/* Half-played episodes */}
          {halfPlayedEpisodes.length > 0 && queue.length === 0 && (
            <View style={styles.queueSection}>
              <Text style={styles.queueSectionTitle}>Continue Listening</Text>
              {halfPlayedEpisodes.slice(0, 3).map((ep, index) => (
                <Pressable
                  key={`half-${ep.episodeId}-${index}`}
                  style={styles.continueItem}
                  onPress={() => {
                    addToQueue({
                      id: ep.episodeId,
                      title: ep.episodeTitle || 'Untitled',
                      description: '',
                      audioUrl: ep.audioUrl || '',
                      pubDate: '',
                      duration: ep.duration,
                      artwork: ep.episodeArtwork || ep.podcastArtwork || '',
                      podcastTitle: ep.podcastTitle,
                    });
                    setQueueVisible(false);
                  }}
                >
                  <Image
                    source={{ uri: ep.podcastArtwork }}
                    style={styles.queueItemArtwork}
                    contentFit="cover"
                  />
                  <View style={styles.queueItemInfo}>
                    <Text style={styles.queueItemTitle} numberOfLines={1}>
                      {ep.episodeTitle}
                    </Text>
                    <Text style={styles.queueItemSubtitle} numberOfLines={1}>
                      {ep.podcastTitle} • {Math.round((ep.position / ep.duration) * 100)}% played
                    </Text>
                  </View>
                  <Text style={styles.addToQueueText}>+ Add</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* More from this podcast */}
          {upNextEpisodes.length > 0 && queue.length === 0 && (
            <View style={styles.queueSection}>
              <Text style={styles.queueSectionTitle}>More from {currentPodcast.collectionName}</Text>
              {upNextEpisodes.map((ep, index) => (
                <Pressable
                  key={`upnext-${ep.id}-${index}`}
                  style={styles.continueItem}
                  onPress={() => {
                    addToQueue(ep);
                    setQueueVisible(false);
                  }}
                >
                  <Image
                    source={{ uri: ep.artwork || currentPodcast.artworkUrl600 }}
                    style={styles.queueItemArtwork}
                    contentFit="cover"
                  />
                  <View style={styles.queueItemInfo}>
                    <Text style={styles.queueItemTitle} numberOfLines={1}>
                      {ep.title}
                    </Text>
                    <Text style={styles.queueItemSubtitle} numberOfLines={1}>
                      {ep.duration ? formatDuration(ep.duration) : ''}
                    </Text>
                  </View>
                  <Text style={styles.addToQueueText}>+ Add</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Empty state */}
          {queue.length === 0 && halfPlayedEpisodes.length === 0 && upNextEpisodes.length === 0 && (
            <View style={styles.emptyQueue}>
              <ListMusic color={Colors.secondaryText} size={48} />
              <Text style={styles.emptyQueueTitle}>Your queue is empty</Text>
              <Text style={styles.emptyQueueText}>
                Add episodes to your queue from the podcast page
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Options Modal */}
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
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: "center",
  },
  headerButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
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
    marginTop: 24,
    marginBottom: 32,
  },
  artworkShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 24,
  },
  artwork: {
    width: width - 80,
    height: width - 80,
    borderRadius: 20,
    backgroundColor: Colors.surface,
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
    letterSpacing: -0.3,
  },
  podcastName: {
    fontSize: 16,
    color: Colors.accent,
    textAlign: "center",
    fontWeight: '500',
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
    paddingHorizontal: 12,
    marginBottom: 32,
  },
  skipButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primaryText,
    textAlign: 'center',
  },
  playButtonOuter: {
    shadowColor: Colors.primaryText,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
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
  // Secondary Controls Row
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    marginBottom: 24,
  },
  secondaryControlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.cardBg,
    position: 'relative',
  },
  speedButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryText,
  },
  queueBadgeSmall: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  queueBadgeTextSmall: {
    color: '#000',
    fontSize: 9,
    fontWeight: '700',
  },
  timerText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.accent,
    marginTop: 2,
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
    display: 'none',
  },
  downloadButtonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
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

  // Up Next Preview
  upNextPreview: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  upNextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  upNextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryText,
    flex: 1,
  },
  upNextCount: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  upNextEpisode: {
    fontSize: 13,
    color: Colors.secondaryText,
  },

  // Queue Badge
  queueBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  queueBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha10,
    borderBottomWidth: 0,
  },
  queueModalContent: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primaryText,
  },
  queueHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.border,
    borderRadius: 16,
  },
  clearButtonText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  menuSection: {
    marginBottom: 16,
  },
  menuLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuLabel: {
    fontSize: 16,
    color: Colors.primaryText,
    fontWeight: '600',
  },
  activeLabel: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
    marginLeft: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
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
    fontSize: 14,
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
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 8,
  },
  menuButtonText: {
    color: Colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.whiteAlpha20,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 10,
  },

  // Queue styles
  nowPlayingSection: {
    marginBottom: 20,
  },
  queueSection: {
    marginBottom: 20,
  },
  queueSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondaryText,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nowPlayingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  nowPlayingArtwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryText,
    marginBottom: 4,
  },
  nowPlayingSubtitle: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    gap: 2,
  },
  playingBar: {
    width: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  playingBar1: {
    height: 12,
  },
  playingBar2: {
    height: 18,
  },
  playingBar3: {
    height: 8,
  },
  queueList: {
    maxHeight: 200,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  queueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  queueItemArtwork: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primaryText,
    marginBottom: 2,
  },
  queueItemSubtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  removeButton: {
    padding: 8,
  },
  continueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  addToQueueText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyQueue: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyQueueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primaryText,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyQueueText: {
    fontSize: 14,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
});
