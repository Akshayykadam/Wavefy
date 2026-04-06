import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Star, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Podcast } from '@/types/podcast';
import SkeletonLoader from '@/components/SkeletonLoader';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;
const CHART_CARD_WIDTH = width * 0.7;

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

const CATEGORIES = [
  { name: 'Arts', colors: ['#EC4899', '#9d174d'] as const, icon: '🎨' },
  { name: 'Education', colors: ['#8B5CF6', '#5721b5'] as const, icon: '📚' },
  { name: 'History', colors: ['#F59E0B', '#b45309'] as const, icon: '🏛️' },
  { name: 'Society', colors: ['#06B6D4', '#0e7490'] as const, icon: '🌍' },
  { name: 'Music', colors: ['#1DB954', '#0d6b30'] as const, icon: '🎵' },
  { name: 'Fiction', colors: ['#E13300', '#7a1c00'] as const, icon: '📖' },
];

export default function DiscoverScreen() {
  const router = useRouter();

  const { data: topPodcasts = [], isLoading: topLoading } = useQuery({
    queryKey: ['top-podcasts'],
    queryFn: () => fetchTopPodcasts(25),
    staleTime: 1000 * 60 * 30, // 30 min cache
  });

  const { data: editorPicks = [], isLoading: editorLoading } = useQuery({
    queryKey: ['editor-picks'],
    queryFn: () => fetchByCategory('best podcasts 2024'),
    staleTime: 1000 * 60 * 30,
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
      />
      <Text style={styles.trendTitle} numberOfLines={2}>{podcast.collectionName}</Text>
      <Text style={styles.trendArtist} numberOfLines={1}>{podcast.artistName}</Text>
    </Pressable>
  );

  const renderChartItem = (podcast: Podcast, index: number) => (
    <Pressable
      key={podcast.collectionId}
      style={({ pressed }) => [styles.chartItem, pressed && { opacity: 0.7 }]}
      onPress={() => navigatePodcast(podcast.collectionId)}
    >
      <Text style={styles.chartRank}>{index + 1}</Text>
      <Image
        source={{ uri: podcast.artworkUrl600 || podcast.artworkUrl100 }}
        style={styles.chartArtwork}
        contentFit="cover"
      />
      <View style={styles.chartInfo}>
        <Text style={styles.chartTitle} numberOfLines={1}>{podcast.collectionName}</Text>
        <Text style={styles.chartArtist} numberOfLines={1}>{podcast.artistName}</Text>
        {podcast.primaryGenreName ? (
          <Text style={styles.chartGenre}>{podcast.primaryGenreName}</Text>
        ) : null}
      </View>
    </Pressable>
  );

  const renderSkeletonCards = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ width: CARD_WIDTH, marginRight: 12 }}>
          <SkeletonLoader style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 12 }} />
          <SkeletonLoader style={{ width: CARD_WIDTH * 0.8, height: 14, borderRadius: 4, marginTop: 8 }} />
          <SkeletonLoader style={{ width: CARD_WIDTH * 0.5, height: 12, borderRadius: 4, marginTop: 4 }} />
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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
                    <SkeletonLoader style={{ width: 48, height: 48, borderRadius: 10, marginRight: 12 }} />
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

          {/* Browse Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star color={Colors.accent} size={18} />
              <Text style={styles.sectionTitle}>Browse Categories</Text>
            </View>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.name}
                  style={({ pressed }) => [styles.categoryTile, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Navigate to search with pre-filled query
                    router.push(`/(tabs)/search?q=${cat.name}` as any);
                  }}
                >
                  <LinearGradient
                    colors={[...cat.colors]}
                    style={styles.categoryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Editor's Picks */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star color={Colors.accent} size={18} fill={Colors.accent} />
              <Text style={styles.sectionTitle}>Editor's Picks</Text>
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

          <View style={{ height: 120 }} />
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
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.primaryText,
    letterSpacing: -0.5,
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
    borderRadius: 12,
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
    gap: 12,
  },
  chartRank: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.secondaryText,
    width: 28,
    textAlign: 'center',
  },
  chartArtwork: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  chartInfo: {
    flex: 1,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryText,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  chartArtist: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  chartGenre: {
    fontSize: 11,
    color: Colors.accent,
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryTile: {
    width: (width - 52) / 2,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  categoryIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
