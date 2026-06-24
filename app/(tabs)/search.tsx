import { useRouter } from "expo-router";
import { Search as SearchIcon, X, Cpu, Crosshair, Laugh, Newspaper, Briefcase, Trophy, HeartPulse, FlaskConical, WifiOff, ChevronRight } from "lucide-react-native";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { Podcast } from "@/types/podcast";
import SkeletonLoader from "@/components/SkeletonLoader";
import { useNetwork } from "@/contexts/NetworkContext";

const { width } = Dimensions.get("window");
const GRID_GAP = 12;
const GRID_PADDING = 20;
const TILE_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;

const GENRE_TILES = [
  {
    name: "Technology",
    colors: ["#121214", "#0a2e1b"] as const,
    accentColor: "#1db954",
    iconBg: "rgba(29, 185, 84, 0.12)",
    Icon: Cpu,
  },
  {
    name: "True Crime",
    colors: ["#121214", "#3b0c0c"] as const,
    accentColor: "#ff4d4d",
    iconBg: "rgba(255, 77, 77, 0.12)",
    Icon: Crosshair,
  },
  {
    name: "Comedy",
    colors: ["#121214", "#4a1228"] as const,
    accentColor: "#ff4d82",
    iconBg: "rgba(255, 77, 130, 0.12)",
    Icon: Laugh,
  },
  {
    name: "News",
    colors: ["#121214", "#0c2540"] as const,
    accentColor: "#3b82f6",
    iconBg: "rgba(59, 130, 246, 0.12)",
    Icon: Newspaper,
  },
  {
    name: "Business",
    colors: ["#121214", "#230f40"] as const,
    accentColor: "#a855f7",
    iconBg: "rgba(168, 85, 247, 0.12)",
    Icon: Briefcase,
  },
  {
    name: "Sports",
    colors: ["#121214", "#3b2a0c"] as const,
    accentColor: "#f59e0b",
    iconBg: "rgba(245, 158, 11, 0.12)",
    Icon: Trophy,
  },
  {
    name: "Health",
    colors: ["#121214", "#0c3b3b"] as const,
    accentColor: "#06b6d4",
    iconBg: "rgba(6, 182, 212, 0.12)",
    Icon: HeartPulse,
  },
  {
    name: "Science",
    colors: ["#121214", "#3b0c2e"] as const,
    accentColor: "#ec4899",
    iconBg: "rgba(236, 72, 153, 0.12)",
    Icon: FlaskConical,
  },
];

export default function SearchScreen() {
  const router = useRouter();
  const { isOffline } = useNetwork();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  const SEARCH_HISTORY_KEY = 'wavefy_search_history';
  const MAX_HISTORY = 10;

  // Load persisted search history on mount
  useEffect(() => {
    AsyncStorage.getItem(SEARCH_HISTORY_KEY).then(stored => {
      if (stored) {
        try { setRecentSearches(JSON.parse(stored)); } catch {}
      }
    });
  }, []);

  // Persist whenever history changes
  const updateHistory = useCallback((updater: (prev: string[]) => string[]) => {
    setRecentSearches(prev => {
      const next = updater(prev);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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
    enabled: debouncedQuery.length > 0 && !isOffline,
  });

  const addToHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    updateHistory(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, MAX_HISTORY);
    });
  }, [updateHistory]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    addToHistory(searchQuery);
  };

  const removeRecent = (index: number) => {
    updateHistory(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllHistory = () => {
    updateHistory(() => []);
  };

  const renderPodcastItem = ({ item }: { item: Podcast }) => (
    <Pressable
      style={({ pressed }) => [styles.resultItem, pressed && { opacity: 0.7 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        addToHistory(query);
        router.push(`/podcast/${item.collectionId}` as any);
      }}
    >
      <Image
        source={{ uri: item.artworkUrl600 }}
        style={styles.resultArtwork}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={2}>
          {item.collectionName}
        </Text>
        <Text style={styles.resultArtist} numberOfLines={1}>
          {item.artistName}
        </Text>
        {item.primaryGenreName ? (
          <View style={styles.resultGenreTag}>
            <Text style={styles.resultGenre}>{item.primaryGenreName}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.resultAction}>
        <ChevronRight color={Colors.secondaryText} size={18} />
      </View>
    </Pressable>
  );

  const renderSearchSkeleton = () => (
    <View style={styles.resultsContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
          <SkeletonLoader style={{ width: 72, height: 72, borderRadius: 12 }} />
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

        <View style={[
          styles.searchContainer,
          isFocused && { borderColor: Colors.accent, borderWidth: 1.2 }
        ]}>
          <SearchIcon
            color={isFocused ? Colors.accent : Colors.secondaryText}
            size={18}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={isOffline ? "Search unavailable offline" : "Podcasts, episodes, creators..."}
            placeholderTextColor={Colors.secondaryText}
            value={isOffline ? "" : query}
            onChangeText={isOffline ? undefined : setQuery}
            returnKeyType="search"
            onSubmitEditing={isOffline ? undefined : () => handleSearch(query)}
            selectionColor={Colors.accent}
            editable={!isOffline}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {query.length > 0 && !isOffline && (
            <Pressable onPress={() => setQuery("")} style={styles.clearButton}>
              <View style={styles.clearButtonInner}>
                <X color={Colors.black} size={12} />
              </View>
            </Pressable>
          )}
        </View>

        {isOffline ? (
          <View style={styles.offlineState}>
            <WifiOff color={Colors.secondaryText} size={48} />
            <Text style={styles.offlineTitle}>You&apos;re offline</Text>
            <Text style={styles.offlineSubtitle}>
              Search requires an internet connection.{"\n"}Listen to your downloads from the Library tab.
            </Text>
          </View>
        ) : query.length === 0 ? (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <View style={styles.recentHeader}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Recent Searches</Text>
                  <Pressable onPress={clearAllHistory} hitSlop={8}>
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </Pressable>
                </View>
                <View style={styles.recentChipsContainer}>
                  {recentSearches.map((search, index) => (
                    <View key={index} style={styles.recentChip}>
                      <Pressable
                        style={styles.recentChipPressable}
                        onPress={() => setQuery(search)}
                      >
                        <Text style={styles.recentChipText} numberOfLines={1}>{search}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => removeRecent(index)}
                        hitSlop={8}
                        style={styles.recentChipClose}
                      >
                        <X color={Colors.secondaryText} size={12} />
                      </Pressable>
                    </View>
                  ))}
                </View>
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
                      pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] }
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
                      <View style={styles.genreTopRow}>
                        <View style={[styles.iconContainer, { backgroundColor: genre.iconBg, borderColor: `${genre.accentColor}33` }]}>
                          <genre.Icon color={genre.accentColor} size={18} />
                        </View>
                      </View>
                      <View style={styles.genreBottomRow}>
                        <Text style={[styles.genreSubText, { color: `${genre.accentColor}bb` }]}>EXPLORE</Text>
                        <Text style={styles.genreText}>{genre.name}</Text>
                      </View>
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
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 48,
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
  clearButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.secondaryText,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.primaryText,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  recentChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 8,
    height: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  recentChipPressable: {
    marginRight: 6,
    justifyContent: 'center',
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primaryText,
  },
  recentChipClose: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  genreTile: {
    width: TILE_WIDTH,
    height: 104,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  genreGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 14,
  },
  genreTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  genreBottomRow: {
    justifyContent: 'flex-end',
  },
  genreSubText: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  genreText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  resultItem: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 14,
    padding: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.whiteAlpha05,
    alignItems: 'center',
  },
  resultAction: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 4,
  },
  resultArtwork: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
  },
  resultInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  resultName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primaryText,
    letterSpacing: -0.2,
  },
  resultArtist: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  resultGenreTag: {
    backgroundColor: Colors.whiteAlpha05,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  resultGenre: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '500',
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
