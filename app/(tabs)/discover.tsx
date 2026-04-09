import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { TrendingUp, Star, Flame, WifiOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Podcast } from '@/types/podcast';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useNetwork } from '@/contexts/NetworkContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;

// Fetch top podcasts from Apple RSS feed
const fetchTopPodcasts = async (limit: number = 25): Promise<Podcast[]> => {
  try {
    const response = await fetch(
      `https://itunes.apple.com/us/rss/toppodcasts/limit=${limit}/json`
    );
    const data = await response.json();
    const entries = data?.feed?.entry || [];

    return entries.map((entry: any) => ({
      collectionId: parseInt(entry.id?.attributes?.['im:id'] || '0'),
      collectionName: entry['im:name']?.label || '',
      artistName: entry['im:artist']?.label || '',
      artworkUrl600: entry['im:image']?.[2]?.label || '',
      artworkUrl100: entry['im:image']?.[1]?.label || '',
      feedUrl: '',
      trackCount: 0,
      releaseDate: entry['im:releaseDate']?.label || '',
      primaryGenreName: entry.category?.attributes?.label || '',
      collectionViewUrl: entry.link?.attributes?.href || '',
    }));
  } catch (e) {
    console.error('Error fetching top podcasts:', e);
    return [];
  }
};

const fetchByCategory = async (genre: string): Promise<Podcast[]> => {
  const response = await fetch(
    `https://itunes.apple.com/search?term=${genre}&media=podcast&limit=10`
  );
  const data = await response.json();
  return data.results || [];
};

const getRankColor = (index: number) => {
  if (index === 0) return Colors.gold;
  if (index === 1) return Colors.silver;
  if (index === 2) return Colors.bronze;
  return Colors.secondaryText;
};

export default function DiscoverScreen() {
  const router = useRouter();
  const { isOffline } = useNetwork();

  const { data: topPodcasts = [], isLoading: topLoading } = useQuery({
    queryKey: ['top-podcasts'],
    queryFn: () => fetchTopPodcasts(25),
    staleTime: 1000 * 60 * 30,
    enabled: !isOffline,
  });

  const { data: editorPicks = [], isLoading: editorLoading } = useQuery({
    queryKey: ['editor-picks'],
    queryFn: () => fetchByCategory('best podcasts 2024'),
    staleTime: 1000 * 60 * 30,
    enabled: !isOffline,
  });

  const navigatePodcast = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/podcast/${id}` as any);
  };

  const renderTrendingCard = (podcast: Podcast) => (
    <Pressable
      key={podcast.collectionId}
      style={({ pressed }) => [styles.trendCard, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
      onPress={() => navigatePodcast(podcast.collectionId)}
    >
      <Image
        source={{ uri: podcast.artworkUrl600 }}
        style={styles.trendArtwork}
        contentFit="cover"
        transition={200}
      />
      <Text style={styles.trendTitle} numberOfLines={2}>{podcast.collectionName}</Text>
      <Text style={styles.trendArtist} numberOfLines={1}>{podcast.artistName}</Text>
    </Pressable>
  );

  const renderChartItem = (podcast: Podcast, index: number) => (
    <Pressable
      key={podcast.collectionId}
      style={({ pressed }) => [
        styles.chartItem,
        pressed && { backgroundColor: Colors.surfaceLight },
        index < 3 && styles.chartItemTop3,
      ]}
      onPress={() => navigatePodcast(podcast.collectionId)}
    >
      <Text style={[styles.chartRank, { color: getRankColor(index) }]}>
        {index + 1}
      </Text>
      <Image
        source={{ uri: podcast.artworkUrl600 || podcast.artworkUrl100 }}
        style={[styles.chartArtwork, index < 3 && styles.chartArtworkTop3]}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.chartInfo}>
        <Text style={styles.chartTitle} numberOfLines={1}>{podcast.collectionName}</Text>
        <Text style={styles.chartArtist} numberOfLines={1}>{podcast.artistName}</Text>
        {podcast.primaryGenreName ? (
          <View style={styles.genreTag}>
            <Text style={styles.chartGenre}>{podcast.primaryGenreName}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );

  const renderSkeletonCards = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ width: CARD_WIDTH, marginRight: 12 }}>
          <SkeletonLoader style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 14 }} />
          <SkeletonLoader style={{ width: CARD_WIDTH * 0.8, height: 14, borderRadius: 4, marginTop: 10 }} />
          <SkeletonLoader style={{ width: CARD_WIDTH * 0.5, height: 12, borderRadius: 4, marginTop: 6 }} />
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>Find your next favorite show</Text>
        </View>

        {isOffline ? (
          <View style={styles.offlineState}>
            <WifiOff color={Colors.secondaryText} size={48} />
            <Text style={styles.offlineTitle}>You&apos;re offline</Text>
            <Text style={styles.offlineSubtitle}>
              Browse your downloads in Library to listen offline
            </Text>
          </View>
        ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Editor's Picks — moved above trending */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star color={Colors.accent} size={18} fill={Colors.accent} />
              <Text style={styles.sectionTitle}>Editor&apos;s Picks</Text>
            </View>
            {editorLoading ? renderSkeletonCards() : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
                snapToInterval={CARD_WIDTH + 12}
                decelerationRate="fast"
              >
                {editorPicks.slice(0, 8).map(renderTrendingCard)}
              </ScrollView>
            )}
          </View>

          {/* Trending Now */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Flame color={Colors.accent} size={18} />
              <Text style={styles.sectionTitle}>Trending Now</Text>
            </View>
            {topLoading ? renderSkeletonCards() : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
                snapToInterval={CARD_WIDTH + 12}
                decelerationRate="fast"
              >
                {topPodcasts.slice(0, 10).map(renderTrendingCard)}
              </ScrollView>
            )}
          </View>

          {/* Top Charts */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp color={Colors.accent} size={18} />
              <Text style={styles.sectionTitle}>Top Charts</Text>
            </View>
            {topLoading ? (
              <View style={{ paddingHorizontal: 20 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <SkeletonLoader style={{ width: 24, height: 20, borderRadius: 4, marginRight: 12 }} />
                    <SkeletonLoader style={{ width: 52, height: 52, borderRadius: 12, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <SkeletonLoader style={{ height: 14, width: '80%', borderRadius: 4, marginBottom: 6 }} />
                      <SkeletonLoader style={{ height: 12, width: '50%', borderRadius: 4 }} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.chartList}>
                {topPodcasts.slice(0, 15).map((p, i) => renderChartItem(p, i))}
              </View>
          )}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.primaryText,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primaryText,
    letterSpacing: -0.3,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
  },
  trendCard: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  trendArtwork: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  trendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryText,
    marginTop: 8,
    letterSpacing: -0.2,
  },
  trendArtist: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  chartList: {
    paddingHorizontal: 20,
  },
  chartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
    borderRadius: 14,
  },
  chartItemTop3: {
    backgroundColor: Colors.whiteAlpha05,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  chartRank: {
    fontSize: 17,
    fontWeight: '800',
    width: 28,
    textAlign: 'center',
  },
  chartArtwork: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  chartArtworkTop3: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  chartInfo: {
    flex: 1,
    gap: 2,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryText,
    letterSpacing: -0.2,
  },
  chartArtist: {
    fontSize: 13,
    color: Colors.secondaryText,
    letterSpacing: -0.1,
  },
  genreTag: {
    backgroundColor: Colors.whiteAlpha05,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  chartGenre: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '500',
  },
  offlineState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryText,
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  offlineSubtitle: {
    fontSize: 14,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
});
