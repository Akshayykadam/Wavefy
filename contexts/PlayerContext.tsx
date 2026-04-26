import createContextHook from '@nkzw/create-context-hook';
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  AppKilledPlaybackBehavior,
  PitchAlgorithm,
  useTrackPlayerEvents,
  Event as TrackPlayerEvent,
} from 'react-native-track-player';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Episode, Podcast } from '@/types/podcast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, AppState, AppStateStatus } from 'react-native';
import { parseRSS } from '@/utils/rss';
import { useDownloads } from '@/contexts/DownloadContext';
import { useNetwork } from '@/contexts/NetworkContext';

const STORAGE_KEYS = {
  EPISODE: 'podcat_current_episode',
  PODCAST: 'podcat_current_podcast',
  POSITION: 'podcat_last_position',
  RATE: 'podcat_playback_rate',
  EPISODE_PROGRESS: 'wavefy_episode_progress',
  CONTINUATION_SETTINGS: 'wavefy_continuation_settings',
  QUEUE: 'wavefy_queue',
};

// Episode Progress Types
export interface EpisodeProgressData {
  episodeId: string;
  podcastId: number;
  position: number;
  duration: number;
  lastPlayedAt: string;
  completed: boolean;
  podcastTitle?: string;
  podcastArtwork?: string;
  episodeTitle?: string;
  episodeArtwork?: string;
  audioUrl?: string;
  feedUrl?: string;
}

// Continuation Settings Types
export interface ContinuationSettings {
  autoplayEnabled: boolean;
  autoQueueFromCreator: boolean;
  moreLikeThisEnabled: boolean;
  allowReplayCompleted: boolean;
}

const DEFAULT_CONTINUATION_SETTINGS: ContinuationSettings = {
  autoplayEnabled: true,
  autoQueueFromCreator: true,
  moreLikeThisEnabled: true,
  allowReplayCompleted: false,
};

export type ContinuationType = 'resume' | 'same_creator' | 'recommendation' | 'none';

const setupPlayer = async () => {
  try {
    await TrackPlayer.setupPlayer();
  } catch (error: any) {
    // Player might be already initialized — that's fine
    if (
      error?.message?.includes('already been initialized') ||
      error?.code === 'player_already_initialized'
    ) {
      // Already set up, continue to updateOptions
    } else {
      console.warn('TrackPlayer.setupPlayer failed:', error);
      return; // Real error — don't try updateOptions
    }
  }
  try {
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      compactCapabilities: [Capability.SkipToPrevious, Capability.Play, Capability.Pause, Capability.SkipToNext],
      progressUpdateEventInterval: 2,
    });
  } catch (error) {
    console.warn('TrackPlayer.updateOptions failed:', error);
  }
};

export const [PlayerProvider, usePlayer] = createContextHook(() => {
  const { getLocalUri, isDownloaded: isEpisodeDownloaded } = useDownloads();
  const { isOffline } = useNetwork();
  // Use ref for isOffline so callbacks always see latest value
  const isOfflineRef = useRef(isOffline);
  useEffect(() => { isOfflineRef.current = isOffline; }, [isOffline]);
  // Use ref for getLocalUri so it doesn't cause callback re-creation
  const getLocalUriRef = useRef(getLocalUri);
  useEffect(() => { getLocalUriRef.current = getLocalUri; }, [getLocalUri]);

  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [queue, setQueue] = useState<Episode[]>([]);
  const [podcastEpisodes, setPodcastEpisodes] = useState<Episode[]>([]); // Episodes from current podcast

  // Manual state tracking for reliability
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Episode Progress State
  const [episodeProgressMap, setEpisodeProgressMap] = useState<{ [id: string]: EpisodeProgressData }>({});

  // Continuation Settings State
  const [continuationSettings, setContinuationSettings] = useState<ContinuationSettings>(DEFAULT_CONTINUATION_SETTINGS);
  const [lastContinuationType, setLastContinuationType] = useState<ContinuationType>('none');

  const isPlayerReadyRef = useRef(false);

  const updateState = useCallback(async () => {
    if (!isPlayerReadyRef.current) return;
    try {
      const state = await TrackPlayer.getPlaybackState();
      // Handle both object return (v4) and direct state
      const actualState = (state as any).state || state;
      setIsPlaying(actualState === State.Playing);
      setIsLoading(actualState === State.Buffering || actualState === State.Loading);
    } catch (e) {
      // Player not ready yet, ignore
    }
  }, []);

  useTrackPlayerEvents([TrackPlayerEvent.PlaybackState], (event) => {
    if (event.type === TrackPlayerEvent.PlaybackState) {
      setIsPlaying(event.state === State.Playing);
      setIsLoading(event.state === State.Buffering || event.state === State.Loading);
    }
  });

  // Sync state once player is ready. Real-time updates handled by TrackPlayerEvent.PlaybackState listener.
  useEffect(() => {
    if (isPlayerReadyRef.current) updateState();
  }, [updateState]);



  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  const sleepTimerTriggeredRef = useRef(false); // Track if sleep timer stopped playback

  const initialSeekPosition = useRef<number | null>(null);
  const isRestoring = useRef(true);
  const hasUserInteracted = useRef(false);
  const playRequestId = useRef<number>(0);

  // Initialize Player
  useEffect(() => {
    const init = async () => {
      await setupPlayer();
      isPlayerReadyRef.current = true;
      setIsPlayerReady(true);
      loadState();
      loadEpisodeProgress();
      loadContinuationSettings();
      loadQueue();
    };
    init();
  }, []);

  const loadQueue = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE);
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  // Save Queue changes to AsyncStorage
  useEffect(() => {
    if (isPlayerReady) {
      AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue)).catch(() => {});
    }
  }, [queue, isPlayerReady]);

  // Load Episode Progress from AsyncStorage
  const loadEpisodeProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.EPISODE_PROGRESS);
      if (stored) {
        setEpisodeProgressMap(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load episode progress:', error);
    }
  };

  // Load Continuation Settings from AsyncStorage
  const loadContinuationSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CONTINUATION_SETTINGS);
      if (stored) {
        setContinuationSettings({ ...DEFAULT_CONTINUATION_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load continuation settings:', error);
    }
  };

  // Save Episode Progress
  const saveEpisodeProgress = async (newMap: { [id: string]: EpisodeProgressData }) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EPISODE_PROGRESS, JSON.stringify(newMap));
    } catch (error) {
      console.error('Failed to save episode progress:', error);
    }
  };

  // Save Continuation Settings
  const saveContinuationSettings = async (settings: ContinuationSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONTINUATION_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save continuation settings:', error);
    }
  };

  // Update episode progress
  const updateEpisodeProgress = useCallback((
    episode: Episode,
    podcast: Podcast,
    position: number,
    duration: number
  ) => {
    if (!episode || !podcast || duration <= 0) return;

    const percentComplete = (position / duration) * 100;
    const completed = percentComplete >= 95;

    setEpisodeProgressMap(prev => {
      const updated: EpisodeProgressData = {
        episodeId: episode.id,
        podcastId: podcast.collectionId,
        position,
        duration,
        lastPlayedAt: new Date().toISOString(),
        completed,
        podcastTitle: podcast.collectionName,
        podcastArtwork: podcast.artworkUrl600,
        episodeTitle: episode.title,
        episodeArtwork: episode.artwork,
        audioUrl: episode.audioUrl,
        feedUrl: podcast.feedUrl,
      };

      const newMap = { ...prev, [episode.id]: updated };
      saveEpisodeProgress(newMap);
      return newMap;
    });
  }, []);

  // Update continuation settings
  const updateContinuationSetting = useCallback(<K extends keyof ContinuationSettings>(
    key: K,
    value: ContinuationSettings[K]
  ) => {
    setContinuationSettings(prev => {
      const updated = { ...prev, [key]: value };
      saveContinuationSettings(updated);
      return updated;
    });
  }, []);

  // Get half-played episodes (5-95% progress)
  const getHalfPlayedEpisodes = useCallback((): EpisodeProgressData[] => {
    return Object.values(episodeProgressMap)
      .filter(p => {
        if (p.completed) return false;
        if (p.duration <= 0) return false;
        const percent = (p.position / p.duration) * 100;
        // Show if played more than 15 seconds, or > 0.5% of duration, and not essentially finished (> 99%)
        return (p.position >= 15 || percent >= 0.5) && percent < 99;
      })
      .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime());
  }, [episodeProgressMap]);

  // Get full listening history
  const getListeningHistory = useCallback((): EpisodeProgressData[] => {
    return Object.values(episodeProgressMap)
      .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime());
  }, [episodeProgressMap]);

  // Remove single item from history
  const removeHistoryItem = useCallback((episodeId: string) => {
    setEpisodeProgressMap(prev => {
      const newMap = { ...prev };
      delete newMap[episodeId];
      saveEpisodeProgress(newMap);
      return newMap;
    });
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setEpisodeProgressMap({});
    saveEpisodeProgress({});
  }, []);

  // Check if episode is completed
  const isEpisodeCompleted = useCallback((episodeId: string): boolean => {
    return episodeProgressMap[episodeId]?.completed ?? false;
  }, [episodeProgressMap]);

  // Load Persisted State
  const loadState = async () => {
    try {
      const keys = [STORAGE_KEYS.EPISODE, STORAGE_KEYS.PODCAST, STORAGE_KEYS.POSITION, STORAGE_KEYS.RATE];
      const result = await AsyncStorage.multiGet(keys);
      const data = Object.fromEntries(result);

      if (data[STORAGE_KEYS.RATE]) {
        const rate = parseFloat(data[STORAGE_KEYS.RATE] || '1.0');
        if (!isNaN(rate)) setPlaybackRate(rate);
      }

      if (data[STORAGE_KEYS.EPISODE] && data[STORAGE_KEYS.PODCAST]) {
        const episode = JSON.parse(data[STORAGE_KEYS.EPISODE] || '{}');
        const podcast = JSON.parse(data[STORAGE_KEYS.PODCAST] || '{}');

        if (data[STORAGE_KEYS.POSITION]) {
          const pos = parseFloat(data[STORAGE_KEYS.POSITION] || '0');
          if (!isNaN(pos)) {
            initialSeekPosition.current = pos;
          }
        }

        setCurrentPodcast(podcast);
        setCurrentEpisode(episode);

        // Restore track to player but don't play
        if (episode.audioUrl) {
          const localUri = getLocalUriRef.current(episode.id);
          await TrackPlayer.reset();
          await TrackPlayer.add({
            id: String(episode.id),
            url: localUri || episode.localUri || episode.audioUrl,
            title: episode.title,
            artist: podcast.collectionName,
            artwork: episode.artwork || podcast.artworkUrl600,
            duration: episode.duration,
          });
          if (initialSeekPosition.current) {
            await TrackPlayer.seekTo(initialSeekPosition.current);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load player state', e);
    } finally {
      isRestoring.current = false;
    }
  };

  // Save Persistence
  useEffect(() => {
    if (!isRestoring.current && currentEpisode && currentPodcast) {
      AsyncStorage.multiSet([
        [STORAGE_KEYS.EPISODE, JSON.stringify(currentEpisode)],
        [STORAGE_KEYS.PODCAST, JSON.stringify(currentPodcast)],
      ]).catch(e => console.warn('Failed to save episode state', e));
    }
  }, [currentEpisode, currentPodcast]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.RATE, String(playbackRate)).catch(() => { });
    if (isPlayerReady) TrackPlayer.setRate(playbackRate);
  }, [playbackRate, isPlayerReady]);

  // Save to AsyncStorage only when AppState changes to background/inactive, or when paused
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/) && currentEpisode && currentPodcast) {
        const { position, duration } = await TrackPlayer.getProgress();
        if (position > 0) {
          AsyncStorage.setItem(STORAGE_KEYS.POSITION, String(position)).catch(() => {});
          updateEpisodeProgress(currentEpisode, currentPodcast, position, duration);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [currentEpisode, currentPodcast, updateEpisodeProgress]);

  // Save position when playback pauses or stops
  useEffect(() => {
    if (!isPlayerReady) return;
    if (!isPlaying && currentEpisode && currentPodcast) {
      TrackPlayer.getProgress().then(({ position, duration }) => {
        if (position > 0) {
          AsyncStorage.setItem(STORAGE_KEYS.POSITION, String(position)).catch(() => {});
          updateEpisodeProgress(currentEpisode, currentPodcast, position, duration);
        }
      }).catch(() => {});
    }
  }, [isPlayerReady, isPlaying, currentEpisode, currentPodcast, updateEpisodeProgress]);

  const playEpisode = useCallback(async (episode: Episode, podcast: Podcast, seekPosition?: number) => {
    if (!isPlayerReady) return;

    const currentReq = Date.now();
    playRequestId.current = currentReq;

    hasUserInteracted.current = true;
    sleepTimerTriggeredRef.current = false; // Reset sleep timer flag

    // Always prefer local file if downloaded
    const localUri = getLocalUriRef.current(episode.id);
    const trackUrl = localUri || episode.localUri || episode.audioUrl;

    // Offline guard: if no local file and offline, alert and bail
    if (!localUri && !episode.localUri && isOfflineRef.current) {
      Alert.alert(
        "Offline",
        "This episode isn't downloaded. Connect to the internet to stream it.",
        [{ text: "OK" }]
      );
      return;
    }

    // Reset seek if new episode
    if (episode.id !== currentEpisode?.id) {
      initialSeekPosition.current = seekPosition ?? null;
      AsyncStorage.setItem(STORAGE_KEYS.POSITION, String(seekPosition ?? 0)).catch(() => { });
    }

    setCurrentEpisode(episode);
    setCurrentPodcast(podcast);

    try {
      await TrackPlayer.pause();
    } catch (e) {}

    if (playRequestId.current !== currentReq) return;

    await TrackPlayer.load({
      id: String(episode.id),
      url: trackUrl,
      title: episode.title,
      artist: podcast.collectionName,
      artwork: episode.artwork || podcast.artworkUrl600,
    });

    if (playRequestId.current !== currentReq) return;

    // Seek to position if resuming
    if (seekPosition && seekPosition > 0) {
      await TrackPlayer.seekTo(seekPosition);
    }

    if (playRequestId.current !== currentReq) return;

    await TrackPlayer.play();
    await TrackPlayer.setRate(playbackRate);

    // Log analytics
    console.log('[Analytics] Episode Started:', {
      episodeId: episode.id,
      podcastId: podcast.collectionId,
      timestamp: new Date().toISOString(),
    });
  }, [currentEpisode, isPlayerReady, playbackRate]);

  const resumeEpisode = useCallback(async (progressData: EpisodeProgressData) => {
    setIsLoading(true);
    try {
      let finalEpisode: Episode | undefined;
      let finalPodcast: Podcast | undefined;

      // Check if this episode is downloaded locally
      const localUri = getLocalUriRef.current(progressData.episodeId);

      let finalFeedUrl = progressData.feedUrl;

      // Skip all network calls if offline
      if (!isOfflineRef.current) {
        // Legacy support: if history item lacks feedUrl, lookup from iTunes first
        if (!finalFeedUrl && progressData.podcastId) {
          try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 8000);
            const response = await fetch(
              `https://itunes.apple.com/lookup?id=${progressData.podcastId}`,
              { signal: controller.signal }
            );
            clearTimeout(tid);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              finalFeedUrl = data.results[0].feedUrl;
            }
          } catch (e) {
            console.warn('iTunes lookup failed during hydration', e);
          }
        }

        // Fast-hydrate if we have feedUrl — with timeout so a dead feed can't hang the app
        if (finalFeedUrl) {
          try {
            const rssPromise = parseRSS(finalFeedUrl);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('RSS hydration timeout')), 10000)
            );
            const episodes = await Promise.race([rssPromise, timeoutPromise]) as Episode[];
            setPodcastEpisodes(episodes);
            finalEpisode = episodes.find(e => e.id === progressData.episodeId);
          } catch (e) {
            console.warn('Failed to hydrate from RSS', e);
          }
        }
      }

      if (!finalEpisode) {
        finalEpisode = {
          id: progressData.episodeId,
          title: progressData.episodeTitle || 'Untitled',
          description: '',
          audioUrl: progressData.audioUrl || '',
          pubDate: '',
          duration: progressData.duration,
          artwork: progressData.episodeArtwork || progressData.podcastArtwork || '',
          podcastTitle: progressData.podcastTitle,
        };
      }

      // Attach local URI if available
      if (localUri) {
        finalEpisode = { ...finalEpisode, localUri };
      }

      // If offline and no local file and no audio URL, can't play
      if (isOfflineRef.current && !localUri && !finalEpisode.audioUrl) {
        Alert.alert(
          "Offline",
          "This episode isn't downloaded. Connect to the internet to stream it.",
          [{ text: "OK" }]
        );
        return;
      }

      finalPodcast = {
        collectionId: progressData.podcastId,
        collectionName: progressData.podcastTitle || '',
        artistName: '',
        artworkUrl600: progressData.podcastArtwork || '',
        artworkUrl100: progressData.podcastArtwork || '',
        feedUrl: finalFeedUrl || '',
        trackCount: 0,
        releaseDate: '',
        primaryGenreName: '',
        collectionViewUrl: '',
      };

      await playEpisode(finalEpisode, finalPodcast, progressData.position);
    } finally {
      setIsLoading(false);
    }
  }, [playEpisode]);

  const togglePlayPause = useCallback(async () => {
    const state = await TrackPlayer.getPlaybackState();
    const actualState = (state as any).state || state;

    if (actualState === State.Playing || actualState === State.Buffering) {
      await TrackPlayer.pause();
      setIsPlaying(false); // Optimistic update
    } else {
      await TrackPlayer.play();
      setIsPlaying(true); // Optimistic update
      sleepTimerTriggeredRef.current = false; // User manually resumed
    }
    setTimeout(updateState, 500); // veriy after delay
  }, [updateState]);

  const seekTo = useCallback(async (time: number) => {
    // PlayerContext passes milliseconds, TrackPlayer uses seconds
    await TrackPlayer.seekTo(time / 1000);
  }, []);

  const skipForward = useCallback(async () => {
    const current = await TrackPlayer.getProgress().then(p => p.position);
    await TrackPlayer.seekTo(current + 10);
  }, []);

  const skipBackward = useCallback(async () => {
    const current = await TrackPlayer.getProgress().then(p => p.position);
    await TrackPlayer.seekTo(current - 10);
  }, []);

  const changePlaybackRate = useCallback(async (rate: number) => {
    setPlaybackRate(rate);
    await TrackPlayer.setRate(rate);
  }, []);

  const togglePlaybackSpeed = useCallback(() => {
    const nextRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
    setPlaybackRate(nextRate);
  }, [playbackRate]);

  // Sleep Timer
  const startSleepTimer = useCallback((minutes: number) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current as NodeJS.Timeout);

    if (minutes === 0) {
      setSleepTimer(null);
      return;
    }

    setSleepTimer(minutes);
    sleepTimerRef.current = setTimeout(async () => {
      sleepTimerTriggeredRef.current = true; // Mark that sleep timer stopped playback
      await TrackPlayer.pause();
      setSleepTimer(null);
      sleepTimerRef.current = null;

      console.log('[Analytics] Sleep Timer Triggered:', {
        episodeId: currentEpisode?.id,
        timestamp: new Date().toISOString(),
      });
    }, minutes * 60 * 1000);
  }, [currentEpisode]);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current as NodeJS.Timeout);
    sleepTimerRef.current = null;
    setSleepTimer(null);
  }, []);

  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current as NodeJS.Timeout);
    };
  }, []);

  // Continuation Logic - Find next episode to play
  const findNextEpisode = useCallback((): { episode: Episode; podcast: Podcast; type: ContinuationType } | null => {
    if (!continuationSettings.autoplayEnabled) {
      return null;
    }

    // Priority 1: Resume half-played episodes
    const halfPlayed = getHalfPlayedEpisodes();
    const resumeCandidate = halfPlayed.find(p => p.episodeId !== currentEpisode?.id && p.audioUrl);

    if (resumeCandidate && resumeCandidate.audioUrl) {
      const episode: Episode = {
        id: resumeCandidate.episodeId,
        title: resumeCandidate.episodeTitle || 'Untitled Episode',
        description: '',
        audioUrl: resumeCandidate.audioUrl,
        pubDate: '',
        duration: resumeCandidate.duration,
        artwork: resumeCandidate.episodeArtwork || resumeCandidate.podcastArtwork || '',
        podcastTitle: resumeCandidate.podcastTitle,
      };
      const podcast: Podcast = {
        collectionId: resumeCandidate.podcastId,
        collectionName: resumeCandidate.podcastTitle || 'Unknown Podcast',
        artistName: '',
        artworkUrl600: resumeCandidate.podcastArtwork || '',
        artworkUrl100: resumeCandidate.podcastArtwork || '',
        feedUrl: '',
        trackCount: 0,
        releaseDate: '',
        primaryGenreName: '',
        collectionViewUrl: '',
      };
      return { episode, podcast, type: 'resume' };
    }

    // Priority 2: Next episode from same podcaster
    if (continuationSettings.autoQueueFromCreator && podcastEpisodes.length > 0 && currentEpisode) {
      const currentIndex = podcastEpisodes.findIndex(e => e.id === currentEpisode.id);

      // Try to find next unplayed episode
      for (let i = currentIndex + 1; i < podcastEpisodes.length; i++) {
        const candidate = podcastEpisodes[i];
        if (continuationSettings.allowReplayCompleted || !isEpisodeCompleted(candidate.id)) {
          if (currentPodcast) {
            return { episode: candidate, podcast: currentPodcast, type: 'same_creator' };
          }
        }
      }

      // Wrap around to beginning
      for (let i = 0; i < currentIndex; i++) {
        const candidate = podcastEpisodes[i];
        if (continuationSettings.allowReplayCompleted || !isEpisodeCompleted(candidate.id)) {
          if (currentPodcast) {
            return { episode: candidate, podcast: currentPodcast, type: 'same_creator' };
          }
        }
      }
    }

    // Priority 3: More Like This (from liked episodes or followed podcasts)
    // Note: This would require additional context about liked episodes
    // For now, we return null and can enhance this later

    return null;
  }, [
    continuationSettings,
    getHalfPlayedEpisodes,
    currentEpisode,
    currentPodcast,
    podcastEpisodes,
    isEpisodeCompleted,
  ]);

  // Handle track end - trigger continuation
  const handleTrackEnd = useCallback(async () => {
    // Don't continue if sleep timer triggered the stop
    if (sleepTimerTriggeredRef.current) {
      console.log('[Analytics] Continuation Skipped: Sleep timer active');
      return;
    }

    // Mark current episode as completed
    const { duration } = await TrackPlayer.getProgress();
    if (currentEpisode && currentPodcast && duration > 0) {
      setEpisodeProgressMap(prev => {
        const updated: EpisodeProgressData = {
          episodeId: currentEpisode.id,
          podcastId: currentPodcast.collectionId,
          position: duration,
          duration: duration,
          lastPlayedAt: new Date().toISOString(),
          completed: true,
          podcastTitle: currentPodcast.collectionName,
          podcastArtwork: currentPodcast.artworkUrl600,
          episodeTitle: currentEpisode.title,
          episodeArtwork: currentEpisode.artwork,
          audioUrl: currentEpisode.audioUrl,
        };
        const newMap = { ...prev, [currentEpisode.id]: updated };
        saveEpisodeProgress(newMap);
        return newMap;
      });

      console.log('[Analytics] Episode Completed:', {
        episodeId: currentEpisode.id,
        podcastId: currentPodcast.collectionId,
        timestamp: new Date().toISOString(),
      });
    }

    // Check queue first
    if (queue.length > 0) {
      const nextEpisode = queue[0];
      setQueue(prev => prev.slice(1));

      let podcastToUse = currentPodcast;
      if (nextEpisode.podcastTitle || nextEpisode.artistName) {
        podcastToUse = {
          collectionId: -1,
          collectionName: nextEpisode.podcastTitle || 'Unknown Podcast',
          artistName: nextEpisode.artistName || 'Unknown Artist',
          artworkUrl600: nextEpisode.artwork || currentPodcast?.artworkUrl600 || '',
          artworkUrl100: nextEpisode.artwork || currentPodcast?.artworkUrl100 || '',
          feedUrl: '',
          trackCount: 0,
          releaseDate: '',
          primaryGenreName: '',
          collectionViewUrl: '',
        };
      }

      if (podcastToUse) {
        setLastContinuationType('same_creator');
        console.log('[Analytics] Continuation: Playing from queue');
        await playEpisode(nextEpisode, podcastToUse);
        return;
      }
    }

    // Find next episode using continuation logic
    const next = findNextEpisode();
    if (next) {
      setLastContinuationType(next.type);
      console.log('[Analytics] Continuation:', {
        type: next.type,
        nextEpisodeId: next.episode.id,
        fromEpisodeId: currentEpisode?.id,
        timestamp: new Date().toISOString(),
      });

      // If resuming, seek to saved position
      if (next.type === 'resume') {
        const saved = episodeProgressMap[next.episode.id];
        await playEpisode(next.episode, next.podcast, saved?.position);
      } else {
        await playEpisode(next.episode, next.podcast);
      }
    } else {
      setLastContinuationType('none');
      console.log('[Analytics] Continuation: No next episode available');
    }
  }, [
    currentEpisode,
    currentPodcast,
    queue,
    findNextEpisode,
    playEpisode,
    episodeProgressMap,
  ]);

  // Use refs for handleTrackEnd to prevent stale closures in the event listener.
  // useTrackPlayerEvents registers only once — without refs, it would capture the initial
  // handleTrackEnd and never see queue/findNextEpisode updates.
  const handleTrackEndRef = useRef(handleTrackEnd);
  useEffect(() => { handleTrackEndRef.current = handleTrackEnd; }, [handleTrackEnd]);

  // Listen for track end event
  useTrackPlayerEvents([TrackPlayerEvent.PlaybackQueueEnded], async (event) => {
    if (event.type === TrackPlayerEvent.PlaybackQueueEnded) {
      console.log('PlayerContext - Track Ended');
      // Small delay to ensure state is settled, then call latest ref
      setTimeout(() => {
        handleTrackEndRef.current();
      }, 500);
    }
  });

  const playNext = useCallback(async () => {
    if (queue.length > 0) {
      const nextEpisode = queue[0];
      setQueue(prev => prev.slice(1));

      let podcastToUse = currentPodcast;
      if (nextEpisode.podcastTitle || nextEpisode.artistName) {
        podcastToUse = {
          collectionId: -1,
          collectionName: nextEpisode.podcastTitle || 'Unknown Podcast',
          artistName: nextEpisode.artistName || 'Unknown Artist',
          artworkUrl600: nextEpisode.artwork || currentPodcast?.artworkUrl600 || '',
          artworkUrl100: nextEpisode.artwork || currentPodcast?.artworkUrl100 || '',
          feedUrl: '',
          trackCount: 0,
          releaseDate: '',
          primaryGenreName: '',
          collectionViewUrl: '',
        };
      }

      if (podcastToUse) {
        await playEpisode(nextEpisode, podcastToUse);
      }
    } else {
      // Try continuation logic
      const next = findNextEpisode();
      if (next) {
        if (next.type === 'resume') {
          const saved = episodeProgressMap[next.episode.id];
          await playEpisode(next.episode, next.podcast, saved?.position);
        } else {
          await playEpisode(next.episode, next.podcast);
        }
      }
    }
  }, [queue, currentPodcast, playEpisode, findNextEpisode, episodeProgressMap]);

  const playPrevious = useCallback(async () => {
    const p = await TrackPlayer.getProgress();
    if (p.position > 5) {
      await TrackPlayer.seekTo(0);
    }
  }, []);

  useTrackPlayerEvents(
    [TrackPlayerEvent.RemoteNext, TrackPlayerEvent.RemotePrevious, TrackPlayerEvent.RemoteJumpForward, TrackPlayerEvent.RemoteJumpBackward],
    async (event) => {
      if (event.type === TrackPlayerEvent.RemoteNext) {
        playNext();
      } else if (event.type === TrackPlayerEvent.RemotePrevious) {
        playPrevious();
      } else if (event.type === TrackPlayerEvent.RemoteJumpForward) {
        skipForward();
      } else if (event.type === TrackPlayerEvent.RemoteJumpBackward) {
        skipBackward();
      }
    }
  );




  return {
    currentEpisode,
    currentPodcast,
    isPlaying,
    isLoading,
    queue,
    playbackRate,
    playEpisode,
    resumeEpisode,
    getHalfPlayedEpisodes,
    getListeningHistory,
    removeHistoryItem,
    clearHistory,
    togglePlayPause,
    seekTo,
    skipForward,
    skipBackward,
    togglePlaybackSpeed,
    changePlaybackRate,
    addToQueue: (ep: Episode) => setQueue(q => [...q, ep]),
    setQueue,
    playNext,
    playPrevious,
    sleepTimer,
    startSleepTimer,
    cancelSleepTimer,
    // Episode Progress
    episodeProgressMap,
    isEpisodeCompleted,
    // Continuation
    continuationSettings,
    updateContinuationSetting,
    lastContinuationType,
    // Podcast Episodes (for continuation)
    podcastEpisodes,
    setPodcastEpisodes,
  };
});
