import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'wavefy_episode_progress';

export interface EpisodeProgress {
    episodeId: string;
    podcastId: number;
    position: number;        // seconds played
    duration: number;        // total duration in seconds
    lastPlayedAt: string;    // ISO timestamp
    completed: boolean;      // marked true when >95% played
    podcastTitle?: string;
    podcastArtwork?: string;
    episodeTitle?: string;
    episodeArtwork?: string;
}

export const [EpisodeProgressProvider, useEpisodeProgress] = createContextHook(() => {
    const [progressMap, setProgressMap] = useState<{ [episodeId: string]: EpisodeProgress }>({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Load progress from storage on mount
    useEffect(() => {
        loadProgress();
    }, []);

    const loadProgress = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setProgressMap(JSON.parse(stored));
            }
        } catch (error) {
            // silent catch
        } finally {
            setIsLoaded(true);
        }
    };

    const saveProgress = async (newProgressMap: { [episodeId: string]: EpisodeProgress }) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProgressMap));
        } catch (error) {
            // silent catch
        }
    };

    // Update progress for an episode
    const updateProgress = useCallback((
        episodeId: string,
        position: number,
        duration: number,
        podcastInfo: {
            podcastId: number;
            podcastTitle?: string;
            podcastArtwork?: string;
            episodeTitle?: string;
            episodeArtwork?: string;
        }
    ) => {
        setProgressMap(prev => {
            const percentComplete = duration > 0 ? (position / duration) * 100 : 0;
            const completed = percentComplete >= 95;

            const updated: EpisodeProgress = {
                episodeId,
                podcastId: podcastInfo.podcastId,
                position,
                duration,
                lastPlayedAt: new Date().toISOString(),
                completed,
                podcastTitle: podcastInfo.podcastTitle,
                podcastArtwork: podcastInfo.podcastArtwork,
                episodeTitle: podcastInfo.episodeTitle,
                episodeArtwork: podcastInfo.episodeArtwork,
            };

            const newMap = { ...prev, [episodeId]: updated };
            saveProgress(newMap);
            return newMap;
        });
    }, []);

    // Get progress for a specific episode
    const getProgress = useCallback((episodeId: string): EpisodeProgress | null => {
        return progressMap[episodeId] || null;
    }, [progressMap]);

    // Get all half-played episodes (5-95% progress), sorted by lastPlayedAt descending
    const getHalfPlayedEpisodes = useCallback((): EpisodeProgress[] => {
        return Object.values(progressMap)
            .filter(p => {
                if (p.completed) return false;
                if (p.duration <= 0) return false;
                const percent = (p.position / p.duration) * 100;
                return percent >= 5 && percent < 95;
            })
            .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime());
    }, [progressMap]);

    // Mark episode as completed
    const markCompleted = useCallback((episodeId: string) => {
        setProgressMap(prev => {
            const existing = prev[episodeId];
            if (!existing) return prev;

            const updated = { ...existing, completed: true };
            const newMap = { ...prev, [episodeId]: updated };
            saveProgress(newMap);
            return newMap;
        });
    }, []);

    // Check if episode is completed
    const isCompleted = useCallback((episodeId: string): boolean => {
        return progressMap[episodeId]?.completed ?? false;
    }, [progressMap]);

    // Get episodes from a specific podcast
    const getEpisodesForPodcast = useCallback((podcastId: number): EpisodeProgress[] => {
        return Object.values(progressMap)
            .filter(p => p.podcastId === podcastId)
            .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime());
    }, [progressMap]);

    // Clear all progress (for testing/reset)
    const clearAllProgress = useCallback(async () => {
        setProgressMap({});
        await AsyncStorage.removeItem(STORAGE_KEY);
    }, []);

    return {
        progressMap,
        isLoaded,
        updateProgress,
        getProgress,
        getHalfPlayedEpisodes,
        markCompleted,
        isCompleted,
        getEpisodesForPodcast,
        clearAllProgress,
    };
});
