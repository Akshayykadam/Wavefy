import createContextHook from '@nkzw/create-context-hook';
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
  AppKilledPlaybackBehavior,
  PitchAlgorithm,
  useTrackPlayerEvents,
  Event as TrackPlayerEvent,
} from 'react-native-track-player';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Episode, Podcast } from '@/types/podcast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  EPISODE: 'podcat_current_episode',
  PODCAST: 'podcat_current_podcast',
  POSITION: 'podcat_last_position',
  RATE: 'podcat_playback_rate',
};

const setupPlayer = async () => {
  try {
    await TrackPlayer.setupPlayer();
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
    // Player might be already initialized
  }
};

export const [PlayerProvider, usePlayer] = createContextHook(() => {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [queue, setQueue] = useState<Episode[]>([]);

  // Manual state tracking for reliability
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const updateState = useCallback(async () => {
    const state = await TrackPlayer.getPlaybackState();
    console.log('PlayerContext - Manual State Check:', state);
    // Handle both object return (v4) and direct state
    const actualState = (state as any).state || state;
    setIsPlaying(actualState === State.Playing);
    setIsLoading(actualState === State.Buffering || actualState === State.Loading);
  }, []);

  useTrackPlayerEvents([TrackPlayerEvent.PlaybackState], (event) => {
    if (event.type === TrackPlayerEvent.PlaybackState) {
      console.log('PlayerContext - State Change Event:', event.state);
      setIsPlaying(event.state === State.Playing);
      setIsLoading(event.state === State.Buffering || event.state === State.Loading);
    }
  });

  // Check state on mount and periodically
  useEffect(() => {
    updateState();
    const interval = setInterval(updateState, 1000); // Poll every second as backup
    return () => clearInterval(interval);
  }, [updateState]);

  const progress = useProgress();

  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | number | null>(null);

  const initialSeekPosition = useRef<number | null>(null);
  const isRestoring = useRef(true);
  const hasUserInteracted = useRef(false);

  // Initialize Player
  useEffect(() => {
    const init = async () => {
      await setupPlayer();
      setIsPlayerReady(true);
      loadState();
    };
    init();
  }, []);

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
          await TrackPlayer.reset();
          await TrackPlayer.add({
            id: String(episode.id),
            url: episode.localUri || episode.audioUrl,
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

  useEffect(() => {
    if (progress.position > 0 && isPlaying) {
      AsyncStorage.setItem(STORAGE_KEYS.POSITION, String(progress.position)).catch(() => { });
    }
  }, [progress.position, isPlaying]);


  const playEpisode = useCallback(async (episode: Episode, podcast: Podcast) => {
    if (!isPlayerReady) return;

    hasUserInteracted.current = true;

    // Reset seek if new episode
    if (episode.id !== currentEpisode?.id) {
      initialSeekPosition.current = null;
      AsyncStorage.setItem(STORAGE_KEYS.POSITION, '0').catch(() => { });
    }

    setCurrentEpisode(episode);
    setCurrentPodcast(podcast);

    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: String(episode.id),
      url: episode.localUri || episode.audioUrl,
      title: episode.title,
      artist: podcast.collectionName,
      artwork: episode.artwork || podcast.artworkUrl600,
    });

    await TrackPlayer.play();
    await TrackPlayer.setRate(playbackRate);
  }, [currentEpisode, isPlayerReady, playbackRate]);

  const togglePlayPause = useCallback(async () => {
    const state = await TrackPlayer.getPlaybackState();
    const actualState = (state as any).state || state;

    if (actualState === State.Playing || actualState === State.Buffering) {
      await TrackPlayer.pause();
      setIsPlaying(false); // Optimistic update
    } else {
      await TrackPlayer.play();
      setIsPlaying(true); // Optimistic update
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
      await TrackPlayer.pause();
      setSleepTimer(null);
      sleepTimerRef.current = null;
    }, minutes * 60 * 1000);
  }, []);

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
    }
  }, [queue, currentPodcast, playEpisode]);

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




  // Provide consistent state interface
  const position = progress.position * 1000;
  const duration = progress.duration * 1000;

  return {
    currentEpisode,
    currentPodcast,
    isPlaying,
    isLoading,
    position,
    duration,
    queue,
    playbackRate,
    playEpisode,
    togglePlayPause,
    seekTo,
    skipForward,
    skipBackward,
    togglePlaybackSpeed,
    changePlaybackRate,
    addToQueue: (ep: Episode) => setQueue(q => [...q, ep]), // Simplified
    setQueue,
    playNext,
    playPrevious,
    sleepTimer,
    startSleepTimer,
    cancelSleepTimer,
  };
});

