import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Episode } from '@/types/podcast';

const LIKED_EPISODES_KEY = 'liked_episodes';

export const [LikedEpisodesProvider, useLikedEpisodes] = createContextHook(() => {
    const [likedEpisodes, setLikedEpisodes] = useState<Episode[]>([]);

    useEffect(() => {
        loadLikedEpisodes();
    }, []);

    const loadLikedEpisodes = async () => {
        try {
            const stored = await AsyncStorage.getItem(LIKED_EPISODES_KEY);
            if (stored) {
                setLikedEpisodes(JSON.parse(stored));
            }
        } catch (error) {
            // silent catch
        }
    };

    const saveLikedEpisodes = async (episodes: Episode[]) => {
        try {
            await AsyncStorage.setItem(LIKED_EPISODES_KEY, JSON.stringify(episodes));
            setLikedEpisodes(episodes);
        } catch (error) {
            // silent catch
        }
    };

    const isLiked = (episodeId: string) => {
        return likedEpisodes.some(e => e.id === episodeId);
    };

    const toggleLike = async (episode: Episode) => {
        const currentlyLiked = isLiked(episode.id);
        let newLikedEpisodes: Episode[];

        if (currentlyLiked) {
            newLikedEpisodes = likedEpisodes.filter(e => e.id !== episode.id);
        } else {
            newLikedEpisodes = [...likedEpisodes, episode];
        }

        await saveLikedEpisodes(newLikedEpisodes);
    };

    return {
        likedEpisodes,
        isLiked,
        toggleLike,
    };
});
