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

export interface Episode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  pubDate: string;
  duration: number;
  artwork: string;
  podcastTitle?: string;
  artistName?: string;
  localUri?: string;
}

export interface PlayerState {
  currentEpisode: Episode | null;
  currentPodcast: Podcast | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  queue: Episode[];
}
