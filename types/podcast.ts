export interface Podcast {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600: string;
  artworkUrl100: string;
  feedUrl: string;
  trackCount: number;
  releaseDate: string;
  primaryGenreName: string;
  collectionViewUrl: string;
}

export interface Chapter {
  title: string;
  startTime: number; // seconds
  endTime?: number;  // seconds
  artwork?: string;
}

export interface Episode {
  id: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  audioUrl: string;
  pubDate: string;
  duration: number;
  artwork: string;
  podcastTitle?: string;
  artistName?: string;
  localUri?: string;
  chapters?: Chapter[];
}

export interface PlayerState {
  currentEpisode: Episode | null;
  currentPodcast: Podcast | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  queue: Episode[];
}

export interface PlaylistData {
  id: string;
  name: string;
  episodes: Episode[];
  createdAt: string;
  updatedAt: string;
}
