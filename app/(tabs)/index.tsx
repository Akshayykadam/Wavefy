import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { Podcast } from "@/types/podcast";
import { usePlayer } from "@/contexts/PlayerContext";
import HeroCarousel from "@/components/HeroCarousel";
import SkeletonLoader from "@/components/SkeletonLoader";
import ContinueListeningCard from "@/components/ContinueListeningCard";
import { useNotifications } from "@/contexts/NotificationContext";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.42;

const fetchFeaturedPodcasts = async (): Promise<Podcast[]> => {
  const genres = ["Technology", "Comedy", "News", "True Crime", "Business"];
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

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning ☀️";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening 🌙";
};

export default function HomeScreen() {
  const router = useRouter();
  const {
    getHalfPlayedEpisodes,
    playEpisode,
    resumeEpisode,
  } = usePlayer();

  const halfPlayed = getHalfPlayedEpisodes();
  const { unreadCount } = useNotifications();

  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ["featured"],
    queryFn: fetchFeaturedPodcasts,
  });

  const { data: technology = [], isLoading: techLoading } = useQuery({
    queryKey: ["technology"],
    queryFn: () => fetchPodcastsByCategory("Technology"),
  });

  const { data: comedy = [], isLoading: comedyLoading } = useQuery({
    queryKey: ["comedy"],
    queryFn: () => fetchPodcastsByCategory("Comedy"),
  });

  const { data: trueCrime = [], isLoading: trueCrimeLoading } = useQuery({
    queryKey: ["true-crime"],
    queryFn: () => fetchPodcastsByCategory("True Crime"),
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

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{getGreeting()}</Text>
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
        >
          {/* Continue Listening */}
          {halfPlayed.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Continue Listening</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {halfPlayed.slice(0, 8).map((ep, index) => (
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
          {renderCategorySection("Technology", technology, techLoading)}
          {renderCategorySection("Comedy", comedy, comedyLoading)}
          {renderCategorySection("True Crime", trueCrime, trueCrimeLoading)}

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
  title: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: Colors.primaryText,
    letterSpacing: -0.5,
    flex: 1,
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
});
