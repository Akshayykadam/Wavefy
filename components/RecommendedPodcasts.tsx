import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Podcast } from '@/types/podcast';
import SkeletonLoader from '@/components/SkeletonLoader';
import { getOptimizedArtwork } from '@/utils/image';
import { useNetwork } from '@/contexts/NetworkContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;

interface RecommendedPodcastsProps {
  genre?: string;
  artistName?: string;
  currentCollectionId?: number;
  title?: string;
}

const fetchRecommendations = async (
  genre?: string,
  artistName?: string,
  currentCollectionId?: number
): Promise<Podcast[]> => {
  const searchTerm = genre || artistName || 'top podcasts';
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        searchTerm
      )}&media=podcast&limit=15`
    );
    const data = await response.json();
    const results: Podcast[] = data.results || [];
    // Exclude current podcast if provided
    return results.filter(
      (p) => !currentCollectionId || p.collectionId !== currentCollectionId
    );
  } catch (e) {
    return [];
  }
};

export default function RecommendedPodcasts({
  genre,
  artistName,
  currentCollectionId,
  title = 'More Like This',
}: RecommendedPodcastsProps) {
  const router = useRouter();
  const { isOffline } = useNetwork();

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['recommendations', genre, artistName, currentCollectionId],
    queryFn: () => fetchRecommendations(genre, artistName, currentCollectionId),
    enabled: !isOffline && (!!genre || !!artistName),
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  if (isOffline || (!isLoading && recommendations.length === 0)) {
    return null;
  }

  const handleNavigate = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/podcast/${id}` as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles color={Colors.accent} size={18} />
        <Text style={styles.title}>{title}</Text>
      </View>

      {isLoading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <SkeletonLoader
                style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 14 }}
              />
              <SkeletonLoader
                style={{
                  width: CARD_WIDTH * 0.85,
                  height: 14,
                  borderRadius: 4,
                  marginTop: 8,
                }}
              />
              <SkeletonLoader
                style={{
                  width: CARD_WIDTH * 0.55,
                  height: 12,
                  borderRadius: 4,
                  marginTop: 6,
                }}
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          snapToInterval={CARD_WIDTH + 12}
          decelerationRate="fast"
        >
          {recommendations.slice(0, 10).map((podcast) => (
            <Pressable
              key={podcast.collectionId}
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => handleNavigate(podcast.collectionId)}
            >
              <Image
                source={{ uri: getOptimizedArtwork(podcast.artworkUrl600 || podcast.artworkUrl100, 160) }}
                style={styles.artwork}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
              <Text style={styles.podcastTitle} numberOfLines={2}>
                {podcast.collectionName}
              </Text>
              <Text style={styles.artistTitle} numberOfLines={1}>
                {podcast.artistName}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.primaryText,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  artwork: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  podcastTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryText,
    marginTop: 8,
    letterSpacing: -0.2,
    lineHeight: 17,
  },
  artistTitle: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },
});
