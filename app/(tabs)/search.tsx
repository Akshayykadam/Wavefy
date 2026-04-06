import { useRouter } from "expo-router";
import { Search as SearchIcon, X, TrendingUp } from "lucide-react-native";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { Podcast } from "@/types/podcast";
import SkeletonLoader from "@/components/SkeletonLoader";

const { width } = Dimensions.get("window");
const GRID_GAP = 12;
const GRID_PADDING = 20;
const TILE_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;

const GENRE_TILES = [
  { name: "Technology", colors: ["#1DB954", "#0d6b30"] as const },
  { name: "True Crime", colors: ["#E13300", "#7a1c00"] as const },
  { name: "Comedy", colors: ["#FF6B6B", "#a33030"] as const },
  { name: "News", colors: ["#3b82f6", "#1e40af"] as const },
  { name: "Business", colors: ["#8B5CF6", "#5721b5"] as const },
  { name: "Sports", colors: ["#F59E0B", "#b45309"] as const },
  { name: "Health", colors: ["#06B6D4", "#0e7490"] as const },
  { name: "Science", colors: ["#EC4899", "#9d174d"] as const },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          debouncedQuery
        )}&media=podcast&limit=20`
      );
      const data = await response.json();
      return data.results as Podcast[];
    },
    enabled: debouncedQuery.length > 0,
  });

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      setRecentSearches([searchQuery, ...recentSearches.slice(0, 4)]);
    }
  };

  const removeRecent = (index: number) => {
    setRecentSearches(prev => prev.filter((_, i) => i !== index));
  };

  const renderPodcastItem = ({ item }: { item: Podcast }) => (
    <Pressable
      style={({ pressed }) => [styles.resultItem, pressed && { opacity: 0.7 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/podcast/${item.collectionId}` as any);
      }}
    >
      <Image
        source={{ uri: item.artworkUrl600 }}
        style={styles.resultArtwork}
        contentFit="cover"
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={2}>
          {item.collectionName}
        </Text>
        <Text style={styles.resultArtist} numberOfLines={1}>
          {item.artistName}
        </Text>
        <Text style={styles.resultGenre} numberOfLines={1}>
          {item.primaryGenreName}
        </Text>
      </View>
    </Pressable>
  );

  const renderSearchSkeleton = () => (
    <View style={styles.resultsContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
          <SkeletonLoader style={{ width: 72, height: 72, borderRadius: 10 }} />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <SkeletonLoader style={{ height: 16, width: '80%', borderRadius: 4, marginBottom: 6 }} />
            <SkeletonLoader style={{ height: 14, width: '50%', borderRadius: 4, marginBottom: 4 }} />
            <SkeletonLoader style={{ height: 12, width: '30%', borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Search</Text>
        </View>

        <View style={styles.searchContainer}>
          <SearchIcon
            color={Colors.secondaryText}
            size={18}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search podcasts..."
            placeholderTextColor={Colors.secondaryText}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(query)}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} style={styles.clearButton}>
              <X color={Colors.secondaryText} size={18} />
            </Pressable>
          )}
        </View>

        {query.length === 0 ? (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent</Text>
                {recentSearches.map((search, index) => (
                  <View key={index} style={styles.recentRow}>
                    <Pressable
                      style={styles.recentItem}
                      onPress={() => setQuery(search)}
                    >
                      <Text style={styles.recentText}>{search}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeRecent(index)}
                      hitSlop={8}
                      style={styles.recentClose}
                    >
                      <X color={Colors.secondaryText} size={14} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Genre Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Browse Categories</Text>
              <View style={styles.genreGrid}>
                {GENRE_TILES.map((genre) => (
                  <Pressable
                    key={genre.name}
                    style={({ pressed }) => [
                      styles.genreTile,
                      pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleSearch(genre.name);
                    }}
                  >
                    <LinearGradient
                      colors={[...genre.colors]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.genreGradient}
                    >
                      <Text style={styles.genreText}>{genre.name}</Text>
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : isLoading && results.length === 0 ? (
          renderSearchSkeleton()
        ) : (
          <FlatList
            data={results}
            renderItem={renderPodcastItem}
            keyExtractor={(item) => item.collectionId.toString()}
            contentContainerStyle={styles.resultsContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyState}>
                  <SearchIcon color={Colors.secondaryText} size={48} />
                  <Text style={styles.emptyStateText}>No results found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Try different keywords
                  </Text>
                </View>
              ) : null
            }
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: Colors.primaryText,
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.primaryText,
    letterSpacing: -0.2,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.primaryText,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  recentItem: {
    flex: 1,
  },
  recentText: {
    fontSize: 16,
    color: Colors.primaryText,
  },
  recentClose: {
    padding: 4,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  genreTile: {
    width: TILE_WIDTH,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
  },
  genreGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
  },
  genreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 150,
  },
  resultItem: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  resultArtwork: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  resultInfo: {
    flex: 1,
    justifyContent: "center",
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.primaryText,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  resultArtist: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginBottom: 2,
  },
  resultGenre: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.primaryText,
    marginTop: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
});
