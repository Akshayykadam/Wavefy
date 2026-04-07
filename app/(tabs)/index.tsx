import { useRouter } from "expo-router";
import { Bell, Play, ChevronRight, ListMusic, Sun, Sunset, Moon, Sparkles, Zap } from "lucide-react-native";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { Podcast } from "@/types/podcast";
import { usePlayer } from "@/contexts/PlayerContext";
import HeroCarousel from "@/components/HeroCarousel";
import SkeletonLoader from "@/components/SkeletonLoader";
import ContinueListeningCard from "@/components/ContinueListeningCard";
import { useNotifications } from "@/contexts/NotificationContext";
import { useRecommendations } from "@/contexts/RecommendationContext";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.42;

const MOODS = ["Top Charts", "Focus", "Comedy", "Learn", "True Crime", "News"];
const MOOD_CATEGORIES: Record<string, string[]> = {
  "Top Charts": ["Trending", "Society", "Culture"],
  "Focus": ["Technology", "Business", "Education"],
  "Comedy": ["Comedy", "Improv", "Stand-up"],
  "Learn": ["Science", "History", "Philosophy"],
  "True Crime": ["True Crime", "Mystery", "Investigative"],
  "News": ["Daily News", "Politics", "Tech News"]
};

const fetchFeaturedPodcasts = async (mood: string): Promise<Podcast[]> => {
  const genres = MOOD_CATEGORIES[mood] || ["Technology", "Comedy", "News", "True Crime", "Business"];
  const randomGenre = genres[Math.floor(Math.random() * genres.length)];
  const response = await fetch(
    `https://itunes.apple.com/search?term=${randomGenre}&media=podcast&limit=10`
  );
  const data = await response.json();
  return data.results;
};

const fetchPodcastsByCategory = async (category: string): Promise<Podcast[]> => {
  const response = await fetch(
    `https://itunes.apple.com/search?term=${category}&media=podcast&limit=6`
  );
  const data = await response.json();
  return data.results;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good Morning", icon: <Sun color={Colors.primaryText} size={28} /> };
  if (hour < 18) return { text: "Good Afternoon", icon: <Sunset color={Colors.primaryText} size={28} /> };
  return { text: "Good Evening", icon: <Moon color={Colors.primaryText} size={28} /> };
};

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeMood, setActiveMood] = useState(MOODS[0]);
  const [refreshing, setRefreshing] = useState(false);

  const {
    getHalfPlayedEpisodes,
    playEpisode,
    resumeEpisode,
    queue,
    setQueue,
  } = usePlayer();

  const halfPlayed = getHalfPlayedEpisodes();
  const { unreadCount } = useNotifications();
  const { recommendations, forYouQueue, isLoading: recsLoading, refreshRecommendations } = useRecommendations();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Promise.all([
      queryClient.invalidateQueries(),
      refreshRecommendations(),
    ]);
    setRefreshing(false);
  }, [queryClient, refreshRecommendations]);

  const activeCategories = MOOD_CATEGORIES[activeMood];

  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ["featured", activeMood],
    queryFn: () => fetchFeaturedPodcasts(activeMood),
  });

  const { data: cat1 = [], isLoading: cat1Loading } = useQuery({
    queryKey: ["category", activeCategories[0]],
    queryFn: () => fetchPodcastsByCategory(activeCategories[0]),
  });

  const { data: cat2 = [], isLoading: cat2Loading } = useQuery({
    queryKey: ["category", activeCategories[1]],
    queryFn: () => fetchPodcastsByCategory(activeCategories[1]),
  });

  const { data: cat3 = [], isLoading: cat3Loading } = useQuery({
    queryKey: ["category", activeCategories[2]],
    queryFn: () => fetchPodcastsByCategory(activeCategories[2]),
  });

  const renderPodcastCard = (podcast: Podcast) => (
    <Pressable
      key={podcast.collectionId}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/podcast/${podcast.collectionId}` as any);
      }}
    >
      <Image
        source={{ uri: podcast.artworkUrl600 }}
        style={styles.artwork}
        contentFit="cover"
      />
      <Text style={styles.podcastName} numberOfLines={2}>
        {podcast.collectionName}
      </Text>
      <Text style={styles.artistName} numberOfLines={1}>
        {podcast.artistName}
      </Text>
    </Pressable>
  );

  const renderSkeletonRow = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ width: CARD_WIDTH, marginRight: 12 }}>
          <SkeletonLoader style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 12 }} />
          <SkeletonLoader style={{ width: CARD_WIDTH * 0.8, height: 14, borderRadius: 4, marginTop: 8 }} />
          <SkeletonLoader style={{ width: CARD_WIDTH * 0.5, height: 12, borderRadius: 4, marginTop: 4 }} />
        </View>
      ))}
    </ScrollView>
  );

  const renderCategorySection = (
    title: string,
    data: Podcast[],
    loading: boolean,
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {loading ? (
        renderSkeletonRow()
      ) : data.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
          snapToInterval={CARD_WIDTH + 12}
          decelerationRate="fast"
        >
          {data.map((podcast) => renderPodcastCard(podcast))}
        </ScrollView>
      ) : null}
    </View>
  );

  const heroEpisode = halfPlayed.length > 0 ? halfPlayed[0] : null;
  const remainingHalfPlayed = halfPlayed.length > 1 ? halfPlayed.slice(1) : [];

  const renderMoodChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodScroll} style={styles.moodScrollContainer}>
      {MOODS.map(mood => (
        <Pressable 
          key={mood}
          style={[styles.moodChip, activeMood === mood && styles.moodChipActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveMood(mood);
          }}
        >
          <Text style={[styles.moodChipText, activeMood === mood && styles.moodChipTextActive]}>{mood}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderUpNextBanner = () => {
    if (!queue || queue.length === 0) return null;
    const nextEp = queue[0];
    return (
      <Pressable 
        style={styles.upNextBanner} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/queue');
        }}
      >
        <ListMusic color={Colors.accent} size={18} />
        <View style={styles.upNextContent}>
          <Text style={styles.upNextLabel}>Up Next</Text>
          <Text style={styles.upNextTitle} numberOfLines={1}>{nextEp.title}</Text>
        </View>
        <ChevronRight color={Colors.secondaryText} size={20} />
      </Pressable>
    )
  };

  const renderHeroCard = () => {
    if (!heroEpisode) return null;
    return (
      <View style={styles.heroWrapper}>
        <Text style={styles.sectionTitle}>Jump Back In</Text>
        <Pressable 
          style={styles.heroContainer} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (resumeEpisode) resumeEpisode(heroEpisode);
          }}
        >
            <Image source={{ uri: heroEpisode.episodeArtwork || heroEpisode.podcastArtwork || '' }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} contentFit="cover" />
            <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={styles.heroOverlay}>
              <View style={styles.heroContentInner}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={styles.heroTitle} numberOfLines={2}>{heroEpisode.episodeTitle || 'Untitled'}</Text>
                  <Text style={styles.heroSubtitle} numberOfLines={1}>{heroEpisode.podcastTitle}</Text>
                </View>
                <View style={styles.heroPlayBtn}>
                  <Play size={22} color={Colors.black} fill={Colors.black} style={{ marginLeft: 3 }}/>
                </View>
              </View>
              <View style={styles.heroProgress}>
                  <View style={[styles.heroProgressBar, { width: `${(heroEpisode.position / Math.max(heroEpisode.duration, 1)) * 100}%` }]} />
              </View>
            </BlurView>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{getGreeting().text}</Text>
            {getGreeting().icon}
          </View>
          <Pressable
            onPress={() => {
              router.push('/notifications' as any);
            }}
            style={styles.bellButton}
          >
            <Bell color={Colors.primaryText} size={22} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        >
          {/* Mood Chips */}
          {renderMoodChips()}
          
          {/* Hero Row */}
          {renderHeroCard()}

          {/* Up Next Preview */}
          {renderUpNextBanner()}

          {/* Continue Listening */}
          {remainingHalfPlayed.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Continue Listening</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {remainingHalfPlayed.slice(0, 8).map((ep, index) => (
                  <ContinueListeningCard
                    key={`continue-${ep.episodeId}-${index}`}
                    episodeTitle={ep.episodeTitle || 'Untitled'}
                    podcastTitle={ep.podcastTitle || ''}
                    artwork={ep.podcastArtwork || ep.episodeArtwork || ''}
                    progress={ep.duration > 0 ? ep.position / ep.duration : 0}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (resumeEpisode) {
                        resumeEpisode(ep);
                      }
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Recommended For You */}
          {recsLoading ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Sparkles color={Colors.accent} size={20} />
                <Text style={styles.sectionTitle}>Recommended For You</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {[1, 2, 3].map((key) => (
                  <View key={`skel-rec-${key}`} style={styles.card}>
                    <SkeletonLoader style={styles.artwork} />
                    <SkeletonLoader style={{ width: '80%', height: 16, marginTop: 12, borderRadius: 4 }} />
                    <SkeletonLoader style={{ width: '60%', height: 12, marginTop: 8, borderRadius: 4 }} />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : recommendations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Sparkles color={Colors.accent} size={20} />
                <Text style={styles.sectionTitle}>Recommended For You</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
                snapToInterval={CARD_WIDTH + 12}
                decelerationRate="fast"
              >
                {recommendations.map((rec) => (
                  <Pressable
                    key={rec.podcast.collectionId}
                    style={({ pressed }) => [
                      styles.card,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/podcast/${rec.podcast.collectionId}` as any);
                    }}
                  >
                    <Image
                      source={{ uri: rec.podcast.artworkUrl600 }}
                      style={styles.artwork}
                      contentFit="cover"
                    />
                    <Text style={styles.podcastName} numberOfLines={2}>
                      {rec.podcast.collectionName}
                    </Text>
                    <View style={styles.recReasonTag}>
                      <Text style={styles.recReason} numberOfLines={1}>
                        {rec.reason}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Your Daily Mix */}
          {recsLoading ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Zap color={Colors.accent} size={20} />
                <Text style={[styles.sectionTitle, { flex: 1 }]}>Your Daily Mix</Text>
              </View>
              {[1, 2, 3].map((key) => (
                <View key={`skel-mix-${key}`} style={[styles.mixItem, { backgroundColor: 'transparent', padding: 0, borderWidth: 0, marginHorizontal: 20 }]}>
                    <SkeletonLoader style={{ width: '100%', height: 72, borderRadius: 14 }} />
                </View>
              ))}
            </View>
          ) : forYouQueue.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Zap color={Colors.accent} size={20} />
                <Text style={[styles.sectionTitle, { flex: 1 }]}>Your Daily Mix</Text>
                <Pressable
                  style={({ pressed }) => [styles.playAllBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const episodes = forYouQueue.map(item => item.episode);
                    if (episodes.length > 0) {
                      const firstItem = forYouQueue[0];
                      playEpisode(firstItem.episode, firstItem.podcast);
                      if (episodes.length > 1) {
                        setQueue(episodes.slice(1));
                      }
                    }
                  }}
                >
                  <Play size={14} color={Colors.black} fill={Colors.black} />
                  <Text style={styles.playAllText}>Play All</Text>
                </Pressable>
              </View>
              {forYouQueue.slice(0, 3).map((item, index) => (
                <Pressable
                  key={`mix-${item.episode.id}-${index}`}
                  style={({ pressed }) => [styles.mixItem, pressed && { backgroundColor: Colors.surfaceLight }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    playEpisode(item.episode, item.podcast);
                  }}
                >
                  <Image
                    source={{ uri: item.episode.artwork || item.podcast.artworkUrl600 }}
                    style={styles.mixArtwork}
                    contentFit="cover"
                  />
                  <View style={styles.mixInfo}>
                    <Text style={styles.mixTitle} numberOfLines={1}>{item.episode.title}</Text>
                    <Text style={styles.mixSubtitle} numberOfLines={1}>{item.podcast.collectionName}</Text>
                  </View>
                  <View style={styles.mixPlayBtn}>
                    <Play size={16} color={Colors.accent} fill={Colors.accent} />
                  </View>
                </Pressable>
              ))}
              {forYouQueue.length > 3 && (
                <Text style={styles.mixMore}>+{forYouQueue.length - 3} more episodes</Text>
              )}
            </View>
          )}

          {/* Featured */}
          {featuredLoading ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Featured Today</Text>
              <SkeletonLoader style={{ width: width - 32, height: width * 0.65, marginHorizontal: 16, borderRadius: 20 }} />
            </View>
          ) : featured.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Featured Today</Text>
              <HeroCarousel podcasts={featured} />
            </View>
          ) : null}

          {/* Category sections */}
          {renderCategorySection(activeCategories[0], cat1, cat1Loading)}
          {renderCategorySection(activeCategories[1], cat2, cat2Loading)}
          {renderCategorySection(activeCategories[2], cat3, cat3Loading)}

          <View style={styles.bottomPadding} />
        </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: Colors.primaryText,
    letterSpacing: -0.5,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  moodScrollContainer: {
    marginBottom: 8,
  },
  moodScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingVertical: 10,
  },
  moodChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.whiteAlpha10,
    borderRadius: 20,
  },
  moodChipActive: {
    backgroundColor: Colors.accent,
  },
  moodChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.secondaryText,
  },
  moodChipTextActive: {
    color: Colors.black,
  },
  heroWrapper: {
    marginVertical: 12,
  },
  heroContainer: {
    marginHorizontal: 20,
    height: 180,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  heroOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroContentInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  heroPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroProgress: {
    height: 4,
    backgroundColor: Colors.whiteAlpha20,
    width: '100%',
  },
  heroProgressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  upNextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  upNextContent: {
    flex: 1,
    marginLeft: 12,
  },
  upNextLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  upNextTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryText,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.primaryText,
    paddingHorizontal: 20,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  artwork: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  podcastName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primaryText,
    marginTop: 8,
    letterSpacing: -0.2,
  },
  artistName: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  bottomPadding: {
    height: 80,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 8,
  },
  recReasonTag: {
    backgroundColor: Colors.accentGlow,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  recReason: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.accent,
    letterSpacing: -0.1,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  playAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.black,
  },
  mixItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mixArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  mixInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  mixTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryText,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  mixSubtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  mixPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  mixMore: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
});
