import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, Clock, PlusCircle, Rss } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { Podcast, Episode } from '@/types/podcast';
import { useFollowedPodcasts } from '@/contexts/FollowedPodcastsContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { parseRSS } from '@/utils/rss';
import { getOptimizedArtwork } from '@/utils/image';
import SkeletonLoader from './SkeletonLoader';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72;

export interface FollowedEpisodeItem extends Episode {
  parentPodcast: Podcast;
}

export default function LatestFollowedEpisodes() {
  const router = useRouter();
  const { followedPodcasts, isLoading: followedLoading } = useFollowedPodcasts();
  const { currentEpisode, isPlaying, playEpisode, togglePlayPause } = usePlayer();

  // Query to fetch and aggregate latest episodes from all followed channels
  const { data: latestEpisodes = [], isLoading: episodesLoading } = useQuery<FollowedEpisodeItem[]>({
    queryKey: ['latest_followed_episodes', followedPodcasts.map(p => p.collectionId).join(',')],
    queryFn: async () => {
      if (!followedPodcasts || followedPodcasts.length === 0) return [];

      // Limit to max 12 channels for fast parallel fetching
      const targetChannels = followedPodcasts.slice(0, 12);
      
      const results = await Promise.allSettled(
        targetChannels.map(async (podcast) => {
          if (!podcast.feedUrl) return [];
          const eps = await parseRSS(podcast.feedUrl);
          return eps.slice(0, 3).map((ep) => ({
            ...ep,
            parentPodcast: podcast,
          }));
        })
      );

      const allEpisodes: FollowedEpisodeItem[] = [];
      results.forEach((res) => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          allEpisodes.push(...res.value);
        }
      });

      // Sort newest first by pubDate
      allEpisodes.sort((a, b) => {
        const timeA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const timeB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return timeB - timeA;
      });

      return allEpisodes.slice(0, 15);
    },
    enabled: followedPodcasts.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const formatPubDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  if (followedLoading) return null;

  // Empty state if user is not following any podcasts yet
  if (followedPodcasts.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Latest Episodes</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.emptyCard, pressed && { opacity: 0.8 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/discover' as any);
          }}
        >
          <View style={styles.emptyIconBg}>
            <Rss color={Colors.accent} size={22} />
          </View>
          <View style={styles.emptyTextContainer}>
            <Text style={styles.emptyTitle}>Follow Channels</Text>
            <Text style={styles.emptySubtitle}>
              Follow your favorite podcasts to see new episode releases right here!
            </Text>
          </View>
          <View style={styles.exploreBadge}>
            <Text style={styles.exploreBadgeText}>Explore</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Latest Episodes</Text>
          <View style={styles.liveDot} />
        </View>
        <Text style={styles.headerSubtitle}>From Channels You Follow</Text>
      </View>

      {episodesLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ width: CARD_WIDTH, marginRight: 12 }}>
              <SkeletonLoader style={{ width: CARD_WIDTH, height: 110, borderRadius: 16 }} />
            </View>
          ))}
        </ScrollView>
      ) : latestEpisodes.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {latestEpisodes.map((item) => {
            const isCurrent = currentEpisode?.id === item.id;
            const isPlayingThis = isCurrent && isPlaying;
            const artworkUrl = getOptimizedArtwork(
              item.artwork || item.parentPodcast.artworkUrl600,
              160
            );

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.card,
                  isCurrent && styles.cardActive,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (isCurrent) {
                    togglePlayPause();
                  } else {
                    playEpisode(item, item.parentPodcast);
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <Image
                    source={{ uri: artworkUrl }}
                    style={styles.artwork}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.podcastName} numberOfLines={1}>
                      {item.parentPodcast.collectionName}
                    </Text>
                    <Text style={styles.pubDateText}>
                      {formatPubDate(item.pubDate)}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.playButton, isPlayingThis && styles.playButtonActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (isCurrent) {
                        togglePlayPause();
                      } else {
                        playEpisode(item, item.parentPodcast);
                      }
                    }}
                  >
                    {isPlayingThis ? (
                      <Pause color="#000" size={14} fill="#000" />
                    ) : (
                      <Play color={Colors.accent} size={14} fill={Colors.accent} style={{ marginLeft: 2 }} />
                    )}
                  </Pressable>
                </View>

                <Text style={styles.episodeTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                {!!formatDuration(item.duration) && (
                  <View style={styles.cardFooter}>
                    <View style={styles.durationPill}>
                      <Clock size={10} color={Colors.secondaryText} style={{ marginRight: 4 }} />
                      <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.primaryText,
    letterSpacing: -0.3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.secondaryText,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
  },
  cardActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surfaceLight,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  artwork: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  podcastName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primaryText,
    marginBottom: 2,
  },
  pubDateText: {
    fontSize: 11,
    color: Colors.secondaryText,
    fontWeight: '500' as const,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: Colors.accent,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primaryText,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.whiteAlpha05,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.secondaryText,
  },
  // Empty state styles
  emptyCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.primaryText,
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 16,
  },
  exploreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.accent,
  },
  exploreBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
});
