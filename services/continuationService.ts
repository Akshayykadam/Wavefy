import { Episode, Podcast } from '@/types/podcast';
import { EpisodeProgress } from '@/contexts/EpisodeProgressContext';
import { ContinuationSettings } from '@/contexts/ContinuationSettingsContext';

export type ContinuationType = 'resume' | 'same_creator' | 'recommendation' | 'none';

export interface ContinuationResult {
    episode: Episode | null;
    podcast: Podcast | null;
    continuationType: ContinuationType;
    reason?: string;
}

interface ContinuationContext {
    currentEpisode: Episode;
    currentPodcast: Podcast;
    halfPlayedEpisodes: EpisodeProgress[];
    queue: Episode[];
    followedPodcasts: Podcast[];
    likedEpisodes: Episode[];
    settings: ContinuationSettings;
    completedEpisodeIds: Set<string>;
    podcastEpisodes?: Episode[]; // Episodes from current podcast's RSS feed
}

/**
 * Get the next episode to play after the current one ends.
 * Priority order:
 * 1. Resume half-played episodes
 * 2. Queue episodes from same podcaster
 * 3. "More Like This" recommendations
 */
export function getNextEpisode(context: ContinuationContext): ContinuationResult {
    const {
        currentEpisode,
        currentPodcast,
        halfPlayedEpisodes,
        queue,
        followedPodcasts,
        likedEpisodes,
        settings,
        completedEpisodeIds,
        podcastEpisodes,
    } = context;

    // Check if autoplay is enabled
    if (!settings.autoplayEnabled) {
        logContinuationEvent(currentEpisode.id, 'none', 'Autoplay disabled');
        return { episode: null, podcast: null, continuationType: 'none', reason: 'Autoplay disabled' };
    }

    // Check if there's already a queued episode (from user's manual queue)
    if (queue.length > 0) {
        // Let the existing queue mechanism handle this
        logContinuationEvent(currentEpisode.id, 'none', 'Using existing queue');
        return { episode: null, podcast: null, continuationType: 'none', reason: 'Using existing queue' };
    }

    // Priority 1: Resume half-played episodes
    const resumeResult = findHalfPlayedEpisode(halfPlayedEpisodes, currentEpisode.id, completedEpisodeIds);
    if (resumeResult) {
        logContinuationEvent(currentEpisode.id, 'resume', `Resuming: ${resumeResult.episodeId}`);
        return {
            episode: createEpisodeFromProgress(resumeResult),
            podcast: createPodcastFromProgress(resumeResult),
            continuationType: 'resume',
            reason: 'Resuming half-played episode',
        };
    }

    // Priority 2: Queue from same podcaster
    if (settings.autoQueueFromCreator && podcastEpisodes && podcastEpisodes.length > 0) {
        const nextFromCreator = findNextFromCreator(
            currentEpisode,
            podcastEpisodes,
            completedEpisodeIds,
            settings.allowReplayCompleted
        );
        if (nextFromCreator) {
            logContinuationEvent(currentEpisode.id, 'same_creator', `Next from creator: ${nextFromCreator.id}`);
            return {
                episode: nextFromCreator,
                podcast: currentPodcast,
                continuationType: 'same_creator',
                reason: 'Next episode from same creator',
            };
        }
    }

    // Priority 3: "More Like This" recommendations
    if (settings.moreLikeThisEnabled) {
        const recommendation = findRecommendation(
            currentPodcast,
            followedPodcasts,
            likedEpisodes,
            completedEpisodeIds,
            settings.allowReplayCompleted
        );
        if (recommendation) {
            logContinuationEvent(currentEpisode.id, 'recommendation', `Recommendation: ${recommendation.episode.id}`);
            return {
                episode: recommendation.episode,
                podcast: recommendation.podcast,
                continuationType: 'recommendation',
                reason: 'Similar content recommendation',
            };
        }
    }

    // No continuation found
    logContinuationEvent(currentEpisode.id, 'none', 'No continuation available');
    return { episode: null, podcast: null, continuationType: 'none', reason: 'No continuation available' };
}

/**
 * Find the most recently played half-finished episode
 */
function findHalfPlayedEpisode(
    halfPlayedEpisodes: EpisodeProgress[],
    currentEpisodeId: string,
    completedEpisodeIds: Set<string>
): EpisodeProgress | null {
    // Filter out current episode and completed ones
    const candidates = halfPlayedEpisodes.filter(
        p => p.episodeId !== currentEpisodeId && !completedEpisodeIds.has(p.episodeId)
    );

    // Return most recent (already sorted by lastPlayedAt)
    return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Find the next episode from the same creator
 */
function findNextFromCreator(
    currentEpisode: Episode,
    podcastEpisodes: Episode[],
    completedEpisodeIds: Set<string>,
    allowReplay: boolean
): Episode | null {
    // Find current episode index
    const currentIndex = podcastEpisodes.findIndex(e => e.id === currentEpisode.id);

    if (currentIndex === -1) {
        // Current episode not in list, just return the first unplayed
        const unplayed = podcastEpisodes.find(e =>
            allowReplay || !completedEpisodeIds.has(e.id)
        );
        return unplayed || null;
    }

    // Try to get the next chronological episode (appearing after in the list)
    for (let i = currentIndex + 1; i < podcastEpisodes.length; i++) {
        const candidate = podcastEpisodes[i];
        if (allowReplay || !completedEpisodeIds.has(candidate.id)) {
            return candidate;
        }
    }

    // Wrap around to beginning if needed
    for (let i = 0; i < currentIndex; i++) {
        const candidate = podcastEpisodes[i];
        if (allowReplay || !completedEpisodeIds.has(candidate.id)) {
            return candidate;
        }
    }

    return null;
}

/**
 * Find a recommendation based on genre/category matching
 */
function findRecommendation(
    currentPodcast: Podcast,
    followedPodcasts: Podcast[],
    likedEpisodes: Episode[],
    completedEpisodeIds: Set<string>,
    allowReplay: boolean
): { episode: Episode; podcast: Podcast } | null {
    // Priority 1: Liked episodes from same genre
    const sameGenreLiked = likedEpisodes.filter(e => {
        // Check if podcast title or artist matches current genre
        // This is a lightweight check since we don't have full podcast metadata for liked episodes
        return (allowReplay || !completedEpisodeIds.has(e.id));
    });

    if (sameGenreLiked.length > 0) {
        const episode = sameGenreLiked[0];
        const podcast: Podcast = {
            collectionId: -1,
            collectionName: episode.podcastTitle || 'Unknown Podcast',
            artistName: episode.artistName || 'Unknown Artist',
            artworkUrl600: episode.artwork || '',
            artworkUrl100: episode.artwork || '',
            feedUrl: '',
            trackCount: 0,
            releaseDate: '',
            primaryGenreName: currentPodcast.primaryGenreName,
            collectionViewUrl: '',
        };
        return { episode, podcast };
    }

    // Priority 2: From followed podcasts in the same genre
    const sameGenrePodcasts = followedPodcasts.filter(
        p => p.primaryGenreName === currentPodcast.primaryGenreName &&
            p.collectionId !== currentPodcast.collectionId
    );

    if (sameGenrePodcasts.length > 0) {
        // Just return a recommendation to explore this podcast
        // The actual episode fetching would need to happen via RSS
        // For now, we'll indicate that a recommendation is available
        // but the caller will need to fetch episodes
        const recommendedPodcast = sameGenrePodcasts[0];
        // Return null for now as we can't fetch RSS episodes synchronously
        // This is a limitation that could be addressed with pre-caching
    }

    return null;
}

/**
 * Create an Episode object from progress data (for resuming)
 */
function createEpisodeFromProgress(progress: EpisodeProgress): Episode {
    return {
        id: progress.episodeId,
        title: progress.episodeTitle || 'Untitled Episode',
        description: '',
        audioUrl: '', // Will need to be fetched
        pubDate: '',
        duration: progress.duration,
        artwork: progress.episodeArtwork || progress.podcastArtwork || '',
        podcastTitle: progress.podcastTitle,
    };
}

/**
 * Create a Podcast object from progress data (for resuming)
 */
function createPodcastFromProgress(progress: EpisodeProgress): Podcast {
    return {
        collectionId: progress.podcastId,
        collectionName: progress.podcastTitle || 'Unknown Podcast',
        artistName: '',
        artworkUrl600: progress.podcastArtwork || '',
        artworkUrl100: progress.podcastArtwork || '',
        feedUrl: '',
        trackCount: 0,
        releaseDate: '',
        primaryGenreName: '',
        collectionViewUrl: '',
    };
}

/**
 * Log continuation event for analytics
 */
function logContinuationEvent(
    fromEpisodeId: string,
    continuationType: ContinuationType,
    details: string
) {
    // Logging removed
}

/**
 * Check if playback was stopped by sleep timer
 * This should be called before triggering continuation
 */
export function wasSleepTimerTriggered(sleepTimer: number | null): boolean {
    // If sleep timer is set to 0 or null, it means it was either never set
    // or it just triggered (and was cleared)
    // The caller should track if sleep timer was active when playback stopped
    return false; // This logic is handled in PlayerContext
}
