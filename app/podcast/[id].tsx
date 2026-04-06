import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Heart, Play, Pause, Download, Check } from "lucide-react-native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { Podcast, Episode } from "@/types/podcast";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFollowedPodcasts } from "@/contexts/FollowedPodcastsContext";
import { useDownloads } from "@/contexts/DownloadContext";
import SkeletonLoader from "@/components/SkeletonLoader";

const { width } = Dimensions.get("window");

const parseRSS = async (url: string): Promise<Episode[]> => {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const episodes: Episode[] = [];
    const itemMatches = text.match(/<item[^>]*>([\s\S]*?)<\/item>/gi);
    if (!itemMatches) return [];
    for (let i = 0; i < Math.min(itemMatches.length, 20); i++) {
      const item = itemMatches[i];
      const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const contentMatch = item.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
      const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || item.match(/<itunes:summary[^>]*>([\s\S]*?)<\/itunes:summary>/i);
      const enclosureMatch = item.match(/<enclosure[^>]*url=["']([^"']*)["']/i);
      const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      const durationMatch = item.match(/<itunes:duration[^>]*>([\s\S]*?)<\/itunes:duration>/i);
      const guidMatch = item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "Unknown Episode";
      let rawDescription = "";
      if (contentMatch) rawDescription = contentMatch[1];
      else if (descMatch) rawDescription = descMatch[1] || descMatch[2] || "";
      const description = rawDescription.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").replace(/<[^>]*>/g, "").trim();
      const audioUrl = enclosureMatch ? enclosureMatch[1] : "";
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : "";
      const durationText = durationMatch ? durationMatch[1].trim() : "0";
      const guid = guidMatch ? guidMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      const duration = parseDuration(durationText);
      episodes.push({ id: guid || audioUrl || `episode-${i}`, title, description, audioUrl, pubDate, duration, artwork: "" });
    }
    return episodes;
  } catch (error) {
    console.error("Error parsing RSS:", error);
    return [];
  }
};

const parseDuration = (duration: string): number => {
  const parts = duration.split(":");
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  return parseInt(duration) || 0;
};

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function PodcastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playEpisode, currentEpisode, isPlaying, togglePlayPause, setPodcastEpisodes } = usePlayer();
  const { isFollowing, toggleFollow } = useFollowedPodcasts();
  const { downloadEpisode, isDownloaded, getDownloadProgress } = useDownloads();
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const { data: podcast, isLoading } = useQuery({
    queryKey: ["podcast", id],
    queryFn: async () => {
      const response = await fetch(`https://itunes.apple.com/lookup?id=${id}`);
      const data = await response.json();
      return data.results[0] as Podcast;
    },
  });

  const { data: episodes = [], isLoading: isEpisodesLoading } = useQuery({
    queryKey: ["episodes", podcast?.feedUrl],
    queryFn: () => parseRSS(podcast?.feedUrl || ""),
    enabled: !!podcast?.feedUrl,
  });

  React.useEffect(() => {
    if (episodes.length > 0) setPodcastEpisodes(episodes);
  }, [episodes, setPodcastEpisodes]);

  // Full page skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color={Colors.primaryText} size={24} />
            </Pressable>
          </View>
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <SkeletonLoader style={{ width: 200, height: 200, borderRadius: 16 }} />
            <SkeletonLoader style={{ width: 180, height: 24, borderRadius: 6, marginTop: 24 }} />
            <SkeletonLoader style={{ width: 120, height: 16, borderRadius: 4, marginTop: 10 }} />
            <SkeletonLoader style={{ width: 140, height: 44, borderRadius: 22, marginTop: 20 }} />
          </View>
          <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
            <SkeletonLoader style={{ width: 80, height: 20, borderRadius: 4, marginBottom: 16 }} />
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                <SkeletonLoader style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <SkeletonLoader style={{ height: 16, width: '85%', borderRadius: 4, marginBottom: 6 }} />
                  <SkeletonLoader style={{ height: 12, width: '55%', borderRadius: 4 }} />
                </View>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!podcast) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Podcast not found</Text>
      </View>
    );
  }

  const latestEpisode = episodes.length > 0 ? episodes[0] : null;
  const isLatestPlaying = latestEpisode && currentEpisode?.id === latestEpisode.id && isPlaying;

  return (
    <View style={styles.container}>
      {/* Immersive backdrop */}
      <Image
        source={{ uri: podcast.artworkUrl600 }}
        style={[StyleSheet.absoluteFill, { height: 360 }]}
        contentFit="cover"
        blurRadius={Platform.OS === 'android' ? 25 : 0}
      />
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 0} tint="dark" style={[StyleSheet.absoluteFill, { height: 360 }]} />
      <LinearGradient
        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', Colors.black]}
        style={[StyleSheet.absoluteFill, { height: 360 }]}
        locations={[0, 0.5, 1]}
      />

      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <ArrowLeft color={Colors.primaryText} size={24} />
          </Pressable>
        </View>

        <Animated.ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          <Animated.View style={[styles.artworkContainer, {
            transform: [{
              translateY: scrollY.interpolate({
                inputRange: [-100, 0, 100],
                outputRange: [-50, 0, 0],
                extrapolate: 'clamp'
              })
            }, {
              scale: scrollY.interpolate({
                inputRange: [-100, 0, 100],
                outputRange: [1.2, 1, 1],
                extrapolate: 'clamp'
              })
            }]
          }]}>
            <View style={styles.artworkShadow}>
              <Image
                source={{ uri: podcast.artworkUrl600 }}
                style={styles.artwork}
                contentFit="cover"
              />
            </View>
          </Animated.View>

          <Text style={styles.podcastName}>{podcast.collectionName}</Text>
          <Text style={styles.artistName}>{podcast.artistName}</Text>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.followButton,
                isFollowing(podcast.collectionId) && styles.followButtonActive
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                toggleFollow(podcast);
              }}
            >
              <Heart
                color={isFollowing(podcast.collectionId) ? Colors.accent : Colors.primaryText}
                size={18}
                fill={isFollowing(podcast.collectionId) ? Colors.accent : "transparent"}
              />
              <Text style={[
                styles.followButtonText,
                isFollowing(podcast.collectionId) && styles.followButtonTextActive
              ]}>
                {isFollowing(podcast.collectionId) ? "Following" : "Follow"}
              </Text>
            </Pressable>
          </View>

          {/* Play Latest CTA */}
          {latestEpisode && (
            <Pressable
              style={({ pressed }) => [styles.playLatestButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                if (isLatestPlaying) {
                  togglePlayPause();
                } else {
                  playEpisode(latestEpisode, podcast);
                }
              }}
            >
              {isLatestPlaying ? (
                <Pause color="#fff" size={20} fill="#fff" />
              ) : (
                <Play color="#fff" size={20} fill="#fff" />
              )}
              <Text style={styles.playLatestText}>
                {isLatestPlaying ? "Pause" : "Play Latest Episode"}
              </Text>
            </Pressable>
          )}

          <View style={styles.episodesSection}>
            <Text style={styles.sectionTitle}>
              Episodes{episodes.length > 0 ? ` (${episodes.length})` : ''}
            </Text>

            {isEpisodesLoading ? (
              <View>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '100%' }}>
                    <SkeletonLoader style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <SkeletonLoader style={{ height: 16, width: '80%', marginBottom: 6 }} />
                      <SkeletonLoader style={{ height: 12, width: '55%' }} />
                    </View>
                  </View>
                ))}
              </View>
            ) : episodes.length === 0 ? (
              <Text style={styles.noEpisodes}>No episodes available</Text>
            ) : (
              episodes.map((episode) => {
                const isCurrentEpisode = currentEpisode?.id === episode.id;
                const isThisPlaying = isCurrentEpisode && isPlaying;
                const downloaded = isDownloaded(episode.id);
                const progress = getDownloadProgress(episode.id);
                const isDownloading = progress > 0 && progress < 100;

                return (
                  <Pressable
                    key={episode.id}
                    style={({ pressed }) => [styles.episodeRow, pressed && { backgroundColor: Colors.surface }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (isCurrentEpisode) togglePlayPause();
                      else playEpisode(episode, podcast);
                    }}
                  >
                    <View style={styles.episodeLeft}>
                      <View style={[styles.playIconContainer, isThisPlaying && styles.playIconActive]}>
                        {isThisPlaying ? (
                          <Pause color={Colors.accent} size={14} fill={Colors.accent} />
                        ) : (
                          <Play color={Colors.accent} size={14} fill={Colors.accent} />
                        )}
                      </View>
                      <View style={styles.episodeInfo}>
                        <Text style={[styles.episodeTitle, isCurrentEpisode && { color: Colors.accent }]} numberOfLines={2}>
                          {episode.title}
                        </Text>
                        <View style={styles.episodeMeta}>
                          <Text style={styles.episodeMetaText}>
                            {formatDate(episode.pubDate)}
                          </Text>
                          <Text style={styles.episodeMetaText}> · </Text>
                          <Text style={styles.episodeMetaText}>
                            {formatDuration(episode.duration)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Pressable
                      style={styles.downloadButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (!downloaded && !isDownloading) downloadEpisode(episode, podcast);
                      }}
                      disabled={downloaded || isDownloading}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color={Colors.secondaryText} />
                      ) : downloaded ? (
                        <Check size={18} color={Colors.accent} />
                      ) : (
                        <Download size={18} color={Colors.secondaryText} />
                      )}
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  safeArea: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.black },
  errorText: { color: Colors.primaryText, fontSize: 16 },
  header: { paddingHorizontal: 16, paddingVertical: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.whiteAlpha10, justifyContent: "center", alignItems: 'center' },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  artworkContainer: { alignItems: "center", marginTop: 8 },
  artworkShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 20,
  },
  artwork: { width: 220, height: 220, borderRadius: 16, backgroundColor: Colors.surface },
  podcastName: {
    fontSize: 22, fontWeight: "700" as const, color: Colors.primaryText,
    textAlign: "center", marginTop: 20, paddingHorizontal: 32, letterSpacing: -0.3,
  },
  artistName: { fontSize: 15, color: Colors.secondaryText, textAlign: "center", marginTop: 6 },
  actions: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    marginTop: 20, gap: 12, paddingHorizontal: 32,
  },
  followButton: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    paddingHorizontal: 28, paddingVertical: 11, borderRadius: 24, gap: 8,
    borderWidth: 1, borderColor: Colors.whiteAlpha10,
  },
  followButtonActive: { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  followButtonText: { color: Colors.primaryText, fontSize: 15, fontWeight: "600" as const },
  followButtonTextActive: { color: Colors.accent },
  playLatestButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accent, borderRadius: 28, marginHorizontal: 32,
    marginTop: 16, paddingVertical: 14, gap: 10,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  playLatestText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  episodesSection: { marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 18, fontWeight: "700" as const, color: Colors.primaryText,
    marginBottom: 16, letterSpacing: -0.3,
  },
  noEpisodes: { color: Colors.secondaryText, fontSize: 14, textAlign: "center", marginTop: 32 },
  episodeRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  episodeLeft: { flexDirection: "row", flex: 1, gap: 12, alignItems: 'center' },
  playIconContainer: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.accentGlow, justifyContent: "center", alignItems: "center",
  },
  playIconActive: { backgroundColor: Colors.accent },
  episodeInfo: { flex: 1 },
  episodeTitle: {
    fontSize: 15, fontWeight: "600" as const, color: Colors.primaryText,
    marginBottom: 4, letterSpacing: -0.2,
  },
  episodeMeta: { flexDirection: "row" },
  episodeMetaText: { fontSize: 12, color: Colors.secondaryText },
  downloadButton: { padding: 8, justifyContent: 'center', alignItems: 'center' },
});
