import { Episode, Podcast } from '@/types/podcast';
import { EpisodeProgressData } from '@/contexts/PlayerContext';
import { parseRSS } from '@/utils/rss';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  genreAffinities: Record<string, number>;
  artistAffinities: Record<string, number>;
  topGenres: string[];
  topArtists: string[];
  listenedPodcastIds: Set<number>;
  completedEpisodeIds: Set<string>;
  followedPodcastIds: Set<number>;
}

export interface ScoredPodcast {
  podcast: Podcast;
  score: number;
  reason: string;
}

export interface QueueItem {
  episode: Episode;
  podcast: Podcast;
  score: number;
}

// ─── Time Decay ───────────────────────────────────────────────────────────────

const TIME_DECAY_DAYS = 30;

/**
 * Returns a multiplier between 0.1 and 1.0 based on how recent the date is.
 * Activity from today = 1.0, activity from 30+ days ago ≈ 0.1
 */
const timeDecay = (dateStr: string): number => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const daysAgo = (now - then) / (1000 * 60 * 60 * 24);
  return Math.max(0.1, 1 - (daysAgo / TIME_DECAY_DAYS) * 0.9);
};

// ─── Profile Builder ──────────────────────────────────────────────────────────

/**
 * Builds a user profile from all available behavioral signals.
 * Each signal contributes weighted genre/artist affinities.
 */
export const buildUserProfile = (
  followedPodcasts: Podcast[],
  likedEpisodes: Episode[],
  episodeProgressMap: Record<string, EpisodeProgressData>,
  playlists: { episodes: Episode[] }[],
): UserProfile => {
  const genreAffinities: Record<string, number> = {};
  const artistAffinities: Record<string, number> = {};
  const listenedPodcastIds = new Set<number>();
  const completedEpisodeIds = new Set<string>();
  const followedPodcastIds = new Set<number>();

  const addGenre = (genre: string | undefined, weight: number) => {
    if (!genre || genre.trim().length === 0) return;
    const g = genre.trim();
    genreAffinities[g] = (genreAffinities[g] || 0) + weight;
  };

  const addArtist = (artist: string | undefined, weight: number) => {
    if (!artist || artist.trim().length === 0) return;
    const a = artist.trim();
    artistAffinities[a] = (artistAffinities[a] || 0) + weight;
  };

  // ── Signal 1: Followed Podcasts (weight 3) ──
  for (const podcast of followedPodcasts) {
    followedPodcastIds.add(podcast.collectionId);
    addGenre(podcast.primaryGenreName, 3);
    addArtist(podcast.artistName, 3);
  }

  // ── Signal 2: Listening History (weight scales with engagement) ──
  for (const progress of Object.values(episodeProgressMap)) {
    listenedPodcastIds.add(progress.podcastId);

    if (progress.completed) {
      completedEpisodeIds.add(progress.episodeId);
    }

    // Engagement score: 0-5 based on completion percentage
    const completionPercent = progress.duration > 0
      ? progress.position / progress.duration
      : 0;
    const engagementWeight = completionPercent * 5;
    const decay = timeDecay(progress.lastPlayedAt);

    // We don't have genre stored in progress, but we have podcastTitle
    // Use artist affinity as a proxy
    addArtist(progress.podcastTitle, engagementWeight * decay);
  }

  // ── Signal 3: Liked Episodes (weight 4) ──
  for (const episode of likedEpisodes) {
    addArtist(episode.podcastTitle, 4);
    addArtist(episode.artistName, 2);
  }

  // ── Signal 4: Playlists (weight 2) ──
  for (const playlist of playlists) {
    for (const episode of playlist.episodes) {
      addArtist(episode.podcastTitle, 2);
    }
  }

  // Sort and pick top genres/artists
  const topGenres = Object.entries(genreAffinities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([genre]) => genre);

  const topArtists = Object.entries(artistAffinities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([artist]) => artist);

  return {
    genreAffinities,
    artistAffinities,
    topGenres,
    topArtists,
    listenedPodcastIds,
    completedEpisodeIds,
    followedPodcastIds,
  };
};

// ─── Podcast Scoring ──────────────────────────────────────────────────────────

/**
 * Scores a candidate podcast against the user profile.
 * Returns 0-15 (higher = better match).
 */
const scorePodcast = (podcast: Podcast, profile: UserProfile): { score: number; reason: string } => {
  let score = 0;
  let reason = '';

  // Genre match (0-10)
  const genreScore = profile.genreAffinities[podcast.primaryGenreName] || 0;
  const normalizedGenre = Math.min(10, genreScore);
  score += normalizedGenre * 0.5;

  if (normalizedGenre > 3) {
    reason = `Because you like ${podcast.primaryGenreName}`;
  }

  // Artist affinity (0-5)
  const artistScore = profile.artistAffinities[podcast.artistName] || 0;
  const normalizedArtist = Math.min(5, artistScore);
  score += normalizedArtist * 0.3;

  if (normalizedArtist > 2 && !reason) {
    reason = `Similar to ${podcast.artistName}`;
  }

  // Novelty bonus — reward unheard podcasts
  if (!profile.listenedPodcastIds.has(podcast.collectionId)) {
    score += 2 * 0.2;
  }

  // Penalty for already-followed (keep recs fresh)
  if (profile.followedPodcastIds.has(podcast.collectionId)) {
    score -= 5;
  }

  if (!reason) {
    reason = 'Picked for you';
  }

  return { score: Math.max(0, score), reason };
};

/**
 * Scores and ranks an array of candidate podcasts.
 * Filters out already-followed and returns top results.
 */
export const scoreAndRankPodcasts = (
  candidates: Podcast[],
  profile: UserProfile,
): ScoredPodcast[] => {
  return candidates
    .map(podcast => {
      const { score, reason } = scorePodcast(podcast, profile);
      return { podcast, score, reason };
    })
    .filter(sp => sp.score > 0)
    .sort((a, b) => b.score - a.score);
};

// ─── Recommendation Fetcher ──────────────────────────────────────────────────

/**
 * Fetches recommended podcasts from iTunes based on the user's top genres.
 * Runs each result through the scoring algorithm.
 */
export const fetchRecommendedPodcasts = async (
  profile: UserProfile,
): Promise<ScoredPodcast[]> => {
  if (profile.topGenres.length === 0 && profile.topArtists.length === 0) {
    return [];
  }

  const allCandidates: Podcast[] = [];
  const seenIds = new Set<number>();

  // Search by top genres (up to 3 queries for variety)
  const searchTerms = profile.topGenres.slice(0, 3);

  // Also mix in a top artist query for diversity
  if (profile.topArtists.length > 0) {
    searchTerms.push(profile.topArtists[0] + ' podcast');
  }

  const fetchPromises = searchTerms.map(async (term) => {
    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=podcast&limit=10`
      );
      const data = await response.json();
      return (data.results || []) as Podcast[];
    } catch {
      return [] as Podcast[];
    }
  });

  const results = await Promise.all(fetchPromises);

  for (const batch of results) {
    for (const podcast of batch) {
      if (!seenIds.has(podcast.collectionId)) {
        seenIds.add(podcast.collectionId);
        allCandidates.push(podcast);
      }
    }
  }

  const scored = scoreAndRankPodcasts(allCandidates, profile);

  // Return top 10, excluding already-followed
  return scored
    .filter(sp => !profile.followedPodcastIds.has(sp.podcast.collectionId))
    .slice(0, 10);
};

// ─── Personalized Queue Generator ─────────────────────────────────────────────

/**
 * Generates a personalized "Daily Mix" queue from the user's followed podcasts.
 * Fetches latest episodes from top podcasts, filters out completed, and sorts
 * by a blend of recency and affinity score.
 */
export const generatePersonalizedQueue = async (
  profile: UserProfile,
  followedPodcasts: Podcast[],
): Promise<QueueItem[]> => {
  if (followedPodcasts.length === 0) return [];

  // Pick top 5 podcasts by affinity (or all if less than 5)
  const ranked = followedPodcasts
    .map(p => ({
      podcast: p,
      affinity: (profile.artistAffinities[p.artistName] || 0) +
                (profile.genreAffinities[p.primaryGenreName] || 0),
    }))
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, 5);

  const queueItems: QueueItem[] = [];

  // Fetch latest episodes from each podcast's RSS feed
  const fetchPromises = ranked.map(async ({ podcast, affinity }) => {
    if (!podcast.feedUrl) return [];

    try {
      const episodes = await parseRSS(podcast.feedUrl);
      // Take latest 3 unfinished episodes
      return episodes
        .slice(0, 3)
        .filter(ep => !profile.completedEpisodeIds.has(ep.id))
        .map(ep => ({
          episode: {
            ...ep,
            artwork: ep.artwork || podcast.artworkUrl600,
            podcastTitle: podcast.collectionName,
            artistName: podcast.artistName,
          },
          podcast,
          score: affinity + recencyScore(ep.pubDate),
        }));
    } catch {
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  for (const batch of results) {
    queueItems.push(...batch);
  }

  // Sort by combined score (affinity + recency), cap at 15
  return queueItems
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
};

/**
 * Gives a recency bonus: episodes from today get +5, from a week ago get +1
 */
const recencyScore = (pubDate: string): number => {
  if (!pubDate) return 0;
  const daysAgo = (Date.now() - new Date(pubDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo < 1) return 5;
  if (daysAgo < 3) return 4;
  if (daysAgo < 7) return 3;
  if (daysAgo < 14) return 2;
  if (daysAgo < 30) return 1;
  return 0;
};
