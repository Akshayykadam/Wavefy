import React, { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, FlatList, Pressable, Animated, Dimensions } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Play, Trash2, Heart, Download, Headphones, Music2, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFollowedPodcasts } from "@/contexts/FollowedPodcastsContext";
import { useLikedEpisodes } from "@/contexts/LikedEpisodesContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { usePlaylist } from "@/contexts/PlaylistContext";
import { Alert, TextInput, ScrollView } from "react-native";

const { width } = Dimensions.get("window");
const TABS = ['Following', 'Liked', 'Downloads', 'Playlists', 'History'] as const;
type TabKey = 'following' | 'liked' | 'downloads' | 'playlists' | 'history';

export default function LibraryScreen() {
  const router = useRouter();
  const { followedPodcasts } = useFollowedPodcasts();
  const { likedEpisodes } = useLikedEpisodes();
  const { downloads, deleteDownload } = useDownloads();
  const { playEpisode, setQueue, resumeEpisode, getListeningHistory, removeHistoryItem, clearHistory } = usePlayer();
  const { playlists, createPlaylist, deletePlaylist } = usePlaylist();
  const [activeTab, setActiveTab] = useState<TabKey>('following');

  // Memoize expensive derived data to avoid recomputing on every render
  const listeningHistory = React.useMemo(
    () => getListeningHistory ? getListeningHistory() : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getListeningHistory]
  );
  const downloadsArray = React.useMemo(
    () => Object.values(downloads) as any[],
    [downloads]
  );

  // Animated underline
  const tabWidths = useRef<number[]>([0, 0, 0, 0, 0]).current;
  const tabPositions = useRef<number[]>([0, 0, 0, 0, 0]).current;
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  const tabIndexMap: Record<TabKey, number> = { following: 0, liked: 1, downloads: 2, playlists: 3, history: 4 };

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

  const renderPodcastItem = useCallback(({ item }: { item: any }) => (
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
  ), [router]);

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

  const renderLikedEpisode = useCallback(({ item, index }: { item: any, index: number }) => (
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
  ), [startLikedPlayback]);

  const renderDownloadedEpisode = useCallback(({ item }: { item: any }) => (
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
  ), [startDownloadPlayback, deleteDownload]);

  const renderHistoryEpisode = useCallback(({ item }: { item: any }) => (
    <Pressable
      style={({ pressed }) => [styles.episodeContainer, pressed && { backgroundColor: Colors.surfaceLight }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (resumeEpisode) resumeEpisode(item);
      }}
    >
      <Image source={{ uri: item.episodeArtwork || item.podcastArtwork || item.artwork }} style={styles.episodeArtwork} contentFit="cover" />
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle} numberOfLines={2}>{item.episodeTitle || item.title || 'Untitled'}</Text>
        <Text style={styles.episodeSubtitle}>{item.podcastTitle || 'Unknown Podcast'}</Text>
      </View>
      {item.completed ? (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>Completed</Text>
        </View>
      ) : item.duration > 0 ? (
        <View style={styles.progressContainerSmall}>
          <View style={[styles.progressBarSmall, { width: `${(item.position / item.duration) * 100}%` }]} />
        </View>
      ) : null}
      <Pressable
        style={styles.deleteBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          removeHistoryItem(item.episodeId);
        }}
        hitSlop={10}
      >
        <Trash2 size={16} color={Colors.secondaryText} />
      </Pressable>
    </Pressable>
  ), [resumeEpisode, removeHistoryItem]);

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
        <ScrollView
          horizontal
          style={{ flexGrow: 0 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContainer}
        >
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
        </ScrollView>

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
            removeClippedSubviews
            ListEmptyComponent={renderEmptyState(
              <Headphones size={48} color={Colors.secondaryText} />,
              "No liked episodes yet"
            )}
          />
        ) : activeTab === 'downloads' ? (
          <FlatList
            key="@"
            data={downloadsArray}
            renderItem={renderDownloadedEpisode}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            removeClippedSubviews
            ListEmptyComponent={renderEmptyState(
              <Download size={48} color={Colors.secondaryText} />,
              "No downloaded episodes"
            )}
          />
        ) : activeTab === 'history' ? (
          <View style={{ flex: 1 }}>
            {listeningHistory.length > 0 && (
              <Pressable 
                style={styles.clearHistoryBtn}
                onPress={() => {
                  Alert.alert("Clear History", "Are you sure you want to clear your entire listening history?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Clear All", style: "destructive", onPress: () => {
                      if (clearHistory) clearHistory();
                    }}
                  ]);
                }}
              >
                <Text style={styles.clearHistoryText}>Clear All</Text>
              </Pressable>
            )}
          <FlatList
              key="!"
              data={listeningHistory}
              renderItem={renderHistoryEpisode}
              keyExtractor={(item) => item.episodeId}
              contentContainerStyle={styles.listContent}
              removeClippedSubviews
              ListEmptyComponent={renderEmptyState(
                <Play size={48} color={Colors.secondaryText} />,
                "No listening history"
              )}
            />
          </View>
        ) : (
          <FlatList
            key="$"
            data={[...playlists, { id: '__create__', name: '', episodes: [], createdAt: '', updatedAt: '' }]}
            renderItem={({ item }) => {
              if (item.id === '__create__') {
                return (
                  <Pressable
                    style={({ pressed }) => [styles.playlistCard, pressed && { opacity: 0.7 }]}
                    onPress={() => {
                      Alert.prompt(
                        'New Playlist',
                        'Enter a name for your playlist',
                        (name) => {
                          if (name && name.trim()) {
                            createPlaylist(name.trim());
                          }
                        }
                      );
                    }}
                  >
                    <View style={styles.createPlaylistArt}>
                      <Plus color={Colors.secondaryText} size={32} />
                    </View>
                    <Text style={styles.playlistName}>Create New</Text>
                  </Pressable>
                );
              }
              const artworks = item.episodes.slice(0, 4).map(e => e.artwork).filter(Boolean);
              return (
                <Pressable
                  style={({ pressed }) => [styles.playlistCard, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/playlist/${item.id}` as any);
                  }}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(
                      'Delete Playlist',
                      `Delete "${item.name}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(item.id) },
                      ]
                    );
                  }}
                >
                  {artworks.length >= 4 ? (
                    <View style={styles.playlistMosaic}>
                      {artworks.slice(0, 4).map((uri, i) => (
                        <Image key={i} source={{ uri }} style={styles.mosaicTile} contentFit="cover" />
                      ))}
                    </View>
                  ) : artworks.length > 0 ? (
                    <Image source={{ uri: artworks[0] }} style={styles.playlistSingleArt} contentFit="cover" />
                  ) : (
                    <View style={styles.createPlaylistArt}>
                      <Music2 color={Colors.secondaryText} size={24} />
                    </View>
                  )}
                  <Text style={styles.playlistName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.playlistCount}>{item.episodes.length} episodes</Text>
                </Pressable>
              );
            }}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
            ListEmptyComponent={renderEmptyState(
              <Music2 size={48} color={Colors.secondaryText} />,
              "No playlists yet"
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
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 4,
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
    borderRadius: 14,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.whiteAlpha05,
  },
  episodeArtwork: {
    width: 52,
    height: 52,
    borderRadius: 10,
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
  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.whiteAlpha10,
    borderRadius: 6,
    marginLeft: 8,
  },
  completedText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  progressContainerSmall: {
    width: 60,
    height: 4,
    backgroundColor: Colors.whiteAlpha10,
    borderRadius: 2,
    marginLeft: 12,
    overflow: 'hidden',
  },
  progressBarSmall: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  clearHistoryBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  clearHistoryText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryText,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.secondaryText,
    letterSpacing: -0.1,
  },
  playlistCard: {
    flex: 1,
    marginBottom: 20,
    maxWidth: '48%',
  },
  playlistMosaic: {
    width: '100%',
    aspectRatio: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 14,
    overflow: 'hidden',
    gap: 2,
    marginBottom: 8,
  },
  mosaicTile: {
    width: '49%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
  },
  playlistSingleArt: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: Colors.surface,
  },
  createPlaylistArt: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.whiteAlpha10,
    borderStyle: 'dashed',
  },
  playlistName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryText,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  playlistCount: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
});
