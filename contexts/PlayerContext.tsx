import createContextHook from '@nkzw/create-context-hook';
import { useAudioPlayer, AudioModule } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Episode, Podcast } from '@/types/podcast';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  EPISODE: 'podcat_current_episode',
  PODCAST: 'podcat_current_podcast',
  POSITION: 'podcat_last_position',
  RATE: 'podcat_playback_rate',
};

export const [PlayerProvider, usePlayer] = createContextHook(() => {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [queue, setQueue] = useState<Episode[]>([]);

  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false); // Now a state variable
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | number | null>(null);

  // Ref to hold the position to seek to after loading a restored episode
  const initialSeekPosition = useRef<number | null>(null);
  // Ref to track if we have attempted to restore state
  const isRestoring = useRef(true);
  const hasUserInteracted = useRef(false);

  // Initialize audio player with the current episode's URL (prefer local if available)
  const audioSource = currentEpisode ? { uri: currentEpisode.localUri || currentEpisode.audioUrl } : null;
  const player = useAudioPlayer(audioSource);

  // Load saved state on mount
  useEffect(() => {

    const loadState = async () => {
      try {
        const keys = [STORAGE_KEYS.EPISODE, STORAGE_KEYS.PODCAST, STORAGE_KEYS.POSITION, STORAGE_KEYS.RATE];
        const result = await AsyncStorage.multiGet(keys);
        const data = Object.fromEntries(result);

        if (data[STORAGE_KEYS.RATE]) {
          const rate = parseFloat(data[STORAGE_KEYS.RATE] || '1.0');
          if (!isNaN(rate)) setPlaybackRate(rate);
        }


        // Only restore if the user hasn't already started playing something
        if (!hasUserInteracted.current && data[STORAGE_KEYS.EPISODE] && data[STORAGE_KEYS.PODCAST]) {

          const episode = JSON.parse(data[STORAGE_KEYS.EPISODE] || '{}');
          const podcast = JSON.parse(data[STORAGE_KEYS.PODCAST] || '{}');

          if (data[STORAGE_KEYS.POSITION]) {
            const pos = parseFloat(data[STORAGE_KEYS.POSITION] || '0');
            if (!isNaN(pos)) {
              initialSeekPosition.current = pos;
            }
          }

          // Set these last to trigger the player source update
          setCurrentPodcast(podcast);
          setCurrentEpisode(episode);
          // Important: Don't set isPlaying to true, we want to start paused
        } else {

        }
      } catch (e) {
        console.warn('Failed to load player state', e);
      } finally {
        isRestoring.current = false;
        isRestoring.current = false;
      }
    };

    loadState();
  }, []);

  // Save Episode and Podcast metadata when they change
  useEffect(() => {
    if (!isRestoring.current && currentEpisode && currentPodcast) {
      AsyncStorage.multiSet([
        [STORAGE_KEYS.EPISODE, JSON.stringify(currentEpisode)],
        [STORAGE_KEYS.PODCAST, JSON.stringify(currentPodcast)],
      ]).catch(e => console.warn('Failed to save episode state', e));
    }
  }, [currentEpisode, currentPodcast]);

  // Save Playback Rate when it changes
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.RATE, String(playbackRate)).catch(() => { });
  }, [playbackRate]);

  // Save Position periodically while playing
  useEffect(() => {
    if (!isPlaying || !currentEpisode) return;

    const saveInterval = setInterval(() => {
      if (player.currentTime > 0) {
        AsyncStorage.setItem(STORAGE_KEYS.POSITION, String(player.currentTime)).catch(() => { });
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [isPlaying, currentEpisode, player.currentTime]);

  // Save position on pause/unmount
  useEffect(() => {
    // If we are pausing or checking logic, save current time
    if (!isPlaying && currentEpisode && player.currentTime > 0) { // Only save on pause, not on every render
      AsyncStorage.setItem(STORAGE_KEYS.POSITION, String(player.currentTime)).catch(() => { });
    }
  }, [isPlaying, currentEpisode, player.currentTime]); // Added player.currentTime to dependencies

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await AudioModule.setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
          interruptionModeAndroid: 'doNotMix',
          shouldPlayInBackground: true,
          allowsRecording: false,
          shouldRouteThroughEarpiece: false,
        });
      } catch (e) {
        console.warn('Failed to set audio mode', e);
      }
    };
    setupAudio();
  }, []);

  // Handle Player Loading and Initial Seek
  useEffect(() => {
    if (player.isLoaded) {
      // Restore playback rate
      player.setPlaybackRate(playbackRate, 'high');

      // Handle initial seek if needed
      if (initialSeekPosition.current !== null) {
        player.seekTo(initialSeekPosition.current);
        initialSeekPosition.current = null; // Clear it so we don't seek again
      }

      // Sync playing state
      if (isPlaying) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [player.isLoaded, isPlaying, playbackRate]);

  // Polling for UI updates (keep existing logic)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (isPlaying) { // Only poll if playing
      const interval = setInterval(() => setTick(t => t + 1), 500);
      return () => clearInterval(interval);
    }
  }, [isPlaying]); // Depend on isPlaying

  const isBuffering = player.isBuffering;
  const isLoading = isPlaying && (isBuffering || !player.isLoaded); // Only show loading when trying to play

  const rawPosition = player.currentTime;
  const rawDuration = player.duration;

  const position = (typeof rawPosition === 'number' && Number.isFinite(rawPosition)) ? rawPosition * 1000 : 0;
  const duration = (typeof rawDuration === 'number' && Number.isFinite(rawDuration)) ? rawDuration * 1000 : 0;

  const playEpisode = useCallback(async (episode: Episode, podcast: Podcast) => {

    hasUserInteracted.current = true;

    // If playing a new episode, clear the initial seek position
    if (episode.id !== currentEpisode?.id) {
      initialSeekPosition.current = null;
      // Reset position in storage for the new episode
      AsyncStorage.setItem(STORAGE_KEYS.POSITION, '0').catch(() => { });
    }

    setCurrentEpisode(episode);
    setCurrentPodcast(podcast);
    setIsPlaying(true);

    // Add to Recents logic could be moved here or kept in UI
  }, [currentEpisode]); // Added currentEpisode to dependencies

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const seekTo = useCallback((time: number) => {
    player.seekTo(time / 1000);
  }, [player]);

  const skipForward = useCallback(() => {
    const currentSeconds = player.currentTime;
    player.seekTo(currentSeconds + 10);
  }, [player]);

  const skipBackward = useCallback(() => {
    const currentSeconds = player.currentTime;
    player.seekTo(currentSeconds - 10);
  }, [player]);

  const changePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    player.setPlaybackRate(rate, 'high');
  }, [player]);

  const togglePlaybackSpeed = useCallback(() => {
    const nextRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
    setPlaybackRate(nextRate);
    player.setPlaybackRate(nextRate, 'high');
  }, [playbackRate, player]);

  const playNext = useCallback(async () => {
    if (queue.length > 0) {
      const nextEpisode = queue[0];
      setQueue(prev => prev.slice(1));

      // If the episode has embedded podcast metadata (e.g. from Liked Episodes), use it
      // otherwise fall back to the currently playing podcast context
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

  const playPrevious = useCallback(() => {
    if (position > 5000) {
      seekTo(0);
    }
  }, [position, seekTo]);

  const addToQueue = useCallback((episode: Episode) => {
    setQueue(prev => [...prev, episode]);
  }, []);

  const startSleepTimer = useCallback((minutes: number) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current as NodeJS.Timeout);

    if (minutes === 0) {
      setSleepTimer(null);
      return;
    }

    setSleepTimer(minutes);
    sleepTimerRef.current = setTimeout(() => {
      setIsPlaying(false);
      setSleepTimer(null);
      sleepTimerRef.current = null;
    }, minutes * 60 * 1000);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current as NodeJS.Timeout);
    sleepTimerRef.current = null;
    setSleepTimer(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current as NodeJS.Timeout);
    };
  }, []);

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
    playNext,
    playPrevious,
    addToQueue,
    setQueue,
    sleepTimer,
    startSleepTimer,
    cancelSleepTimer,
  };
});
