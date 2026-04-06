import { useRouter } from "expo-router";
import { View, Text, StyleSheet, FlatList, Pressable, Animated, Dimensions } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Play, Trash2, Heart, Download, Headphones } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFollowedPodcasts } from "@/contexts/FollowedPodcastsContext";
import { useLikedEpisodes } from "@/contexts/LikedEpisodesContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useState, useRef, useCallback } from "react";

const { width } = Dimensions.get("window");
const TABS = ['Following', 'Liked', 'Downloads'] as const;
type TabKey = 'following' | 'liked' | 'downloads';

export default function LibraryScreen() {
  const router = useRouter();
  const { followedPodcasts } = useFollowedPodcasts();
  const { likedEpisodes } = useLikedEpisodes();
  const { downloads, deleteDownload } = useDownloads();
  const { playEpisode, setQueue } = usePlayer();
  const [activeTab, setActiveTab] = useState<TabKey>('following');

  // Animated underline
  const tabWidths = useRef<number[]>([0, 0, 0]).current;
  const tabPositions = useRef<number[]>([0, 0, 0]).current;
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  const tabIndexMap: Record<TabKey, number> = { following: 0, liked: 1, downloads: 2 };

  const switchTab = useCallback((tab: TabKey) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
    const idx = tabIndexMap[tab];
    Animated.parallel([
      Animated.spring(indicatorLeft, {
        toValue: tabPositions[idx] || 0,
        useNativeDriver: false,
        tension: 300,
        friction: 30,
      }),
      Animated.spring(indicatorWidth, {
        toValue: tabWidths[idx] || 60,
        useNativeDriver: false,
        tension: 300,
        friction: 30,
      }),
    ]).start();
  }, [indicatorLeft, indicatorWidth, tabPositions, tabWidths]);

  const onTabLayout = useCallback((index: number, x: number, w: number) => {
    tabPositions[index] = x;
    tabWidths[index] = w;
    if (index === 0 && activeTab === 'following') {
      indicatorLeft.setValue(x);
      indicatorWidth.setValue(w);
    }
  }, [activeTab, indicatorLeft, indicatorWidth, tabPositions, tabWidths]);

  const renderPodcastItem = ({ item }: { item: any }) => (
    <Pressable
      style={({ pressed }) => [styles.podcastItem, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/podcast/${item.collectionId}`);
      }}
    >
      <Image source={{ uri: item.artworkUrl600 }} style={styles.artwork} contentFit="cover" />
      <Text style={styles.podcastTitle} numberOfLines={2}>
        {item.collectionName}
      </Text>
      <Text style={styles.podcastAuthor} numberOfLines={1}>
        {item.artistName}
      </Text>
    </Pressable>
  );

  const startLikedPlayback = (episode: any, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextEpisodes = likedEpisodes.slice(index + 1);
    setQueue(nextEpisodes);
    playEpisode(episode, {
      collectionId: episode.collectionId || -1,
      collectionName: episode.podcastTitle || 'Unknown Podcast',
      artistName: episode.artistName || 'Unknown Artist',
      artworkUrl600: episode.artwork || '',
      artworkUrl100: episode.artwork || '',
      feedUrl: '', trackCount: 0, releaseDate: '', primaryGenreName: '', collectionViewUrl: '',
    });
  };

  const startDownloadPlayback = (episode: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playEpisode(episode, {
      collectionId: -1,
      collectionName: episode.podcastName || 'Downloaded',
      artistName: episode.artistName || 'Unknown',
      artworkUrl600: episode.podcastArtwork || episode.artwork || '',
      artworkUrl100: episode.podcastArtwork || episode.artwork || '',
      feedUrl: '', trackCount: 0, releaseDate: '', primaryGenreName: '', collectionViewUrl: '',
    });
  };

  const renderLikedEpisode = ({ item, index }: { item: any, index: number }) => (
    <Pressable
      style={({ pressed }) => [styles.episodeContainer, pressed && { backgroundColor: Colors.surfaceLight }]}
      onPress={() => startLikedPlayback(item, index)}
    >
      <Image source={{ uri: item.artwork }} style={styles.episodeArtwork} contentFit="cover" />
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.episodeSubtitle}>{item.podcastTitle || item.collectionName || 'Unknown Podcast'}</Text>
      </View>
      <View style={styles.playBtn}>
        <Play size={18} color={Colors.accent} fill={Colors.accent} />
      </View>
    </Pressable>
  );

  const renderDownloadedEpisode = ({ item }: { item: any }) => (
    <Pressable
      style={({ pressed }) => [styles.episodeContainer, pressed && { backgroundColor: Colors.surfaceLight }]}
      onPress={() => startDownloadPlayback(item)}
    >
      <Image source={{ uri: item.podcastArtwork || item.artwork }} style={styles.episodeArtwork} contentFit="cover" />
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.episodeSubtitle}>
          {item.status === 'downloading' ? `Downloading ${Math.round(item.progress)}%` : (item.podcastName || 'Downloaded')}
        </Text>
      </View>
      <Pressable
        style={styles.deleteBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          deleteDownload(item.id);
        }}
        hitSlop={10}
      >
        <Trash2 size={18} color={Colors.secondaryText} />
      </Pressable>
    </Pressable>
  );

  const renderEmptyState = (icon: React.ReactNode, text: string) => (
    <View style={styles.emptyState}>
      {icon}
      <Text style={styles.emptyTitle}>{text}</Text>
      <Text style={styles.emptySubtitle}>Start exploring to fill this up</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <Text style={styles.headerTitle}>Library</Text>

        {/* Tab bar */}
        <View style={styles.tabContainer}>
          {TABS.map((tab, index) => {
            const key = tab.toLowerCase() as TabKey;
            const isActive = activeTab === key;
            return (
              <Pressable
                key={tab}
                onLayout={(e) => {
                  const { x, width: w } = e.nativeEvent.layout;
                  onTabLayout(index, x, w);
                }}
                style={styles.tabButton}
                onPress={() => switchTab(key)}
              >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>{tab}</Text>
              </Pressable>
            );
          })}
          <Animated.View
            style={[
              styles.tabIndicator,
              { left: indicatorLeft, width: indicatorWidth },
            ]}
          />
        </View>

        {activeTab === 'following' ? (
          <FlatList
            key="#"
            data={followedPodcasts}
            renderItem={renderPodcastItem}
            keyExtractor={(item) => item.collectionId.toString()}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
            ListEmptyComponent={renderEmptyState(
              <Heart size={48} color={Colors.secondaryText} />,
              "No podcasts followed yet"
            )}
          />
        ) : activeTab === 'liked' ? (
          <FlatList
            key="_"
            data={likedEpisodes}
            renderItem={renderLikedEpisode}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState(
              <Headphones size={48} color={Colors.secondaryText} />,
              "No liked episodes yet"
            )}
          />
        ) : (
          <FlatList
            key="@"
            data={Object.values(downloads) as any[]}
            renderItem={renderDownloadedEpisode}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState(
              <Download size={48} color={Colors.secondaryText} />,
              "No downloaded episodes"
            )}
          />
        )}
      </SafeAreaView>
    </View>
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
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.primaryText,
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondaryText,
    letterSpacing: -0.2,
  },
  activeTabText: {
    color: Colors.primaryText,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  columnWrapper: {
    gap: 16,
  },
  podcastItem: {
    flex: 1,
    marginBottom: 20,
    maxWidth: "48%",
  },
  artwork: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.surface,
  },
  podcastTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primaryText,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  podcastAuthor: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  episodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 10,
  },
  episodeArtwork: {
    width: 52,
    height: 52,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: Colors.surfaceLight,
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryText,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  episodeSubtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primaryText,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
});
