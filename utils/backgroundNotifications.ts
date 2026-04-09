import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BACKGROUND_TASK_NAME = 'WAVEFY_CHECK_NEW_EPISODES';
const FOLLOWED_STORAGE_KEY = '@followed_podcasts';
const NOTIFICATIONS_STORAGE_KEY = 'wavefy_notifications';
const LAST_SEEN_KEY = 'wavefy_last_seen_episodes';

export interface NotificationItem {
  id: string;
  podcastId: number;
  podcastTitle: string;
  podcastArtwork: string;
  episodeTitle: string;
  episodeId: string;
  timestamp: string;
  read: boolean;
}

/**
 * Core logic: checks RSS feeds for new episodes.
 * Used by both the background task AND the in-app refresh.
 * Returns the new notification items found.
 */
export async function checkForNewEpisodes(): Promise<NotificationItem[]> {
  try {
    // Read followed podcasts from AsyncStorage (context may not be available in background)
    const storedPodcasts = await AsyncStorage.getItem(FOLLOWED_STORAGE_KEY);
    if (!storedPodcasts) return [];

    const followedPodcasts = JSON.parse(storedPodcasts);
    if (!Array.isArray(followedPodcasts) || followedPodcasts.length === 0) return [];

    const lastSeenRaw = await AsyncStorage.getItem(LAST_SEEN_KEY);
    const lastSeen: Record<string, string> = lastSeenRaw ? JSON.parse(lastSeenRaw) : {};

    // Check feeds in parallel (not sequentially) — max wait = single timeout instead of N × timeout
    const feedChecks = followedPodcasts.slice(0, 10).map(async (podcast: any) => {
      try {
        if (!podcast.feedUrl) return null;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(podcast.feedUrl, {
          headers: { 'User-Agent': 'Wavefy/1.0' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const text = await response.text();

        // Parse first <item> from RSS
        const itemMatch = text.match(/<item[^>]*>([\s\S]*?)<\/item>/i);
        if (!itemMatch) return null;

        const item = itemMatch[1];
        const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const guidMatch = item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
        const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

        const episodeTitle = titleMatch
          ? titleMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').replace(/<[^>]*>/g, '').trim()
          : '';
        const episodeId = guidMatch
          ? guidMatch[1].replace(/<[^>]*>/g, '').trim()
          : '';

        if (!episodeId || !episodeTitle) return null;

        const podcastKey = String(podcast.collectionId);
        if (lastSeen[podcastKey] === episodeId) return null;

        // New episode found!
        lastSeen[podcastKey] = episodeId;

        const notifItem: NotificationItem = {
          id: `notif-${podcastKey}-${episodeId}`,
          podcastId: podcast.collectionId,
          podcastTitle: podcast.collectionName,
          podcastArtwork: podcast.artworkUrl600 || podcast.artworkUrl100 || '',
          episodeTitle,
          episodeId,
          timestamp: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
          read: false,
        };

        // Fire a local push notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: podcast.collectionName,
            body: `New episode: ${episodeTitle}`,
            data: { podcastId: podcast.collectionId },
            sound: 'default',
          },
          trigger: null, // immediately
        });

        return notifItem;
      } catch (e) {
        // Skip failed feeds silently
        return null;
      }
    });

    const results = await Promise.allSettled(feedChecks);
    const newNotifications: NotificationItem[] = results
      .filter((r): r is PromiseFulfilledResult<NotificationItem | null> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value!);


    // Persist last seen
    await AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(lastSeen));

    // Merge new notifications into stored list
    if (newNotifications.length > 0) {
      const storedNotifsRaw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      const existingNotifs: NotificationItem[] = storedNotifsRaw ? JSON.parse(storedNotifsRaw) : [];
      const merged = [...newNotifications, ...existingNotifs].slice(0, 50);
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(merged));
    }

    return newNotifications;
  } catch (e) {
    console.error('[BackgroundNotifications] checkForNewEpisodes error:', e);
    return [];
  }
}

/**
 * Define the background task. Must be called at the top level (outside components).
 */
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    const newItems = await checkForNewEpisodes();
    return newItems.length > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (e) {
    console.error('[BackgroundNotifications] Task error:', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task. Call once on app startup.
 */
export async function registerBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes (Android minimum)
      stopOnTerminate: false,   // Keep running after app is killed
      startOnBoot: true,        // Start after device reboot
    });

    console.log('[BackgroundNotifications] Background fetch registered');
  } catch (e) {
    console.error('[BackgroundNotifications] Failed to register background fetch:', e);
  }
}

/**
 * Set up notification channel (Android) and request permissions.
 */
export async function setupNotifications(): Promise<boolean> {
  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('new-episodes', {
      name: 'New Episodes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3B30',
      sound: 'default',
    });
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}
