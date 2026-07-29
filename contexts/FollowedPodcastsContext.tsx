import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Podcast } from '@/types/podcast';

const STORAGE_KEY = '@followed_podcasts';

export const [FollowedPodcastsProvider, useFollowedPodcasts] = createContextHook(() => {
    const [followedPodcasts, setFollowedPodcasts] = useState<Podcast[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load followed podcasts from storage on mount
    useEffect(() => {
        loadFollowedPodcasts();
    }, []);

    const loadFollowedPodcasts = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setFollowedPodcasts(JSON.parse(stored));
            }
        } catch (error) {
            // silent catch
        } finally {
            setIsLoading(false);
        }
    };

    const saveFollowedPodcasts = async (podcasts: Podcast[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(podcasts));
        } catch (error) {
            // silent catch
        }
    };

    const followPodcast = useCallback(async (podcast: Podcast) => {
        setFollowedPodcasts(prev => {
            const newList = [...prev, podcast];
            saveFollowedPodcasts(newList);
            return newList;
        });
    }, []);

    const unfollowPodcast = useCallback(async (podcastId: number) => {
        setFollowedPodcasts(prev => {
            const newList = prev.filter(p => p.collectionId !== podcastId);
            saveFollowedPodcasts(newList);
            return newList;
        });
    }, []);

    const isFollowing = useCallback((podcastId: number) => {
        return followedPodcasts.some(p => p.collectionId === podcastId);
    }, [followedPodcasts]);

    const toggleFollow = useCallback(async (podcast: Podcast) => {
        if (isFollowing(podcast.collectionId)) {
            await unfollowPodcast(podcast.collectionId);
        } else {
            await followPodcast(podcast);
        }
    }, [isFollowing, followPodcast, unfollowPodcast]);

    return {
        followedPodcasts,
        isLoading,
        followPodcast,
        unfollowPodcast,
        isFollowing,
        toggleFollow,
    };
});
