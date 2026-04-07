import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Podcast, Episode } from '@/types/podcast';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFollowedPodcasts } from '@/contexts/FollowedPodcastsContext';
import { useLikedEpisodes } from '@/contexts/LikedEpisodesContext';
import { usePlaylist } from '@/contexts/PlaylistContext';
import {
  UserProfile,
  ScoredPodcast,
  QueueItem,
  buildUserProfile,
  fetchRecommendedPodcasts,
  generatePersonalizedQueue,
} from '@/utils/recommendation';

const STORAGE_KEY = 'wavefy_recommendations_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedData {
  recommendations: ScoredPodcast[];
  forYouQueue: QueueItem[];
  timestamp: number;
}

interface RecommendationContextType {
  recommendations: ScoredPodcast[];
  forYouQueue: QueueItem[];
  isLoading: boolean;
  userProfile: UserProfile | null;
  refreshRecommendations: () => Promise<void>;
}

const RecommendationContext = createContext<RecommendationContextType>({
  recommendations: [],
  forYouQueue: [],
  isLoading: false,
  userProfile: null,
  refreshRecommendations: async () => {},
});

export function useRecommendations() {
  return useContext(RecommendationContext);
}

export function RecommendationProvider({ children }: { children: React.ReactNode }) {
  const [recommendations, setRecommendations] = useState<ScoredPodcast[]>([]);
  const [forYouQueue, setForYouQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const lastRefresh = useRef<number>(0);
  const isFetchingRef = useRef(false);

  const { episodeProgressMap } = usePlayer();
  const { followedPodcasts } = useFollowedPodcasts();
  const { likedEpisodes } = useLikedEpisodes();
  const { playlists } = usePlaylist();

  // Load cached recommendations on mount
  useEffect(() => {
    loadCache();
  }, []);

  const progressCount = Object.keys(episodeProgressMap).length;

  // Auto-refresh when key signals change (debounced)
  useEffect(() => {
    // Don't refresh on initial empty state
    if (followedPodcasts.length === 0 && progressCount === 0) {
      return;
    }

    // Check if enough time has passed since last refresh
    const now = Date.now();
    if (now - lastRefresh.current < CACHE_TTL_MS) {
      // Still within TTL — only rebuild profile (instant, no network)
      const profile = buildUserProfile(
        followedPodcasts,
        likedEpisodes,
        episodeProgressMap,
        playlists,
      );
      setUserProfile(profile);
      return;
    }

    // Full refresh needed
    // Instantly update lastRefresh so concurrent context-load triggers are debounced
    lastRefresh.current = Date.now();
    refreshRecommendations();
  }, [followedPodcasts.length, likedEpisodes.length, progressCount]);

  const loadCache = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const cached: CachedData = JSON.parse(stored);
        const age = Date.now() - cached.timestamp;

        if (age < CACHE_TTL_MS) {
          setRecommendations(cached.recommendations);
          setForYouQueue(cached.forYouQueue);
          lastRefresh.current = cached.timestamp;
        }
      }
    } catch (e) {
      console.warn('Failed to load recommendation cache:', e);
    }
  };

  const saveCache = async (recs: ScoredPodcast[], queue: QueueItem[]) => {
    try {
      const data: CachedData = {
        recommendations: recs,
        forYouQueue: queue,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save recommendation cache:', e);
    }
  };

  const refreshRecommendations = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      // Step 1: Build user profile
      const profile = buildUserProfile(
        followedPodcasts,
        likedEpisodes,
        episodeProgressMap,
        playlists,
      );
      setUserProfile(profile);

      // Step 2: Fetch and score recommendations (parallel with queue)
      const [recs, queue] = await Promise.all([
        fetchRecommendedPodcasts(profile),
        generatePersonalizedQueue(profile, followedPodcasts),
      ]);

      setRecommendations(recs);
      setForYouQueue(queue);
      lastRefresh.current = Date.now();

      // Cache results
      await saveCache(recs, queue);

      console.log('[Recommendations] Refreshed:', {
        profileGenres: profile.topGenres,
        recsCount: recs.length,
        queueCount: queue.length,
      });
    } catch (e) {
      console.error('[Recommendations] Refresh failed:', e);
      // Reset refresh timer so it tries again
      lastRefresh.current = 0;
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [followedPodcasts, likedEpisodes, episodeProgressMap, playlists]);

  return (
    <RecommendationContext.Provider value={{
      recommendations,
      forYouQueue,
      isLoading,
      userProfile,
      refreshRecommendations,
    }}>
      {children}
    </RecommendationContext.Provider>
  );
}
