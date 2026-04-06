import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFollowedPodcasts } from './FollowedPodcastsContext';

const STORAGE_KEY = 'wavefy_notifications';
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

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refreshNotifications: () => Promise<void>;
  isRefreshing: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
  refreshNotifications: async () => {},
  isRefreshing: false,
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { followedPodcasts } = useFollowedPodcasts();

  // Load notifications from storage
  useEffect(() => {
    loadNotifications();
  }, []);

  // Check for new episodes when app opens or followed podcasts change
  useEffect(() => {
    if (followedPodcasts.length > 0) {
      refreshNotifications();
    }
  }, [followedPodcasts.length]);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  const saveNotifications = async (items: NotificationItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  };

  const refreshNotifications = useCallback(async () => {
    if (followedPodcasts.length === 0 || isRefreshing) return;
    setIsRefreshing(true);

    try {
      const lastSeenRaw = await AsyncStorage.getItem(LAST_SEEN_KEY);
      const lastSeen: Record<string, string> = lastSeenRaw ? JSON.parse(lastSeenRaw) : {};
      const newNotifications: NotificationItem[] = [];

      for (const podcast of followedPodcasts.slice(0, 10)) {
        try {
          if (!podcast.feedUrl) continue;
          const response = await fetch(podcast.feedUrl, {
            headers: { 'User-Agent': 'Wavefy/1.0' },
          });
          const text = await response.text();

          // Get first item from RSS
          const itemMatch = text.match(/<item[^>]*>([\s\S]*?)<\/item>/i);
          if (!itemMatch) continue;

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

          if (!episodeId || !episodeTitle) continue;

          const podcastKey = String(podcast.collectionId);
          if (lastSeen[podcastKey] === episodeId) continue;

          // New episode found
          lastSeen[podcastKey] = episodeId;
          newNotifications.push({
            id: `notif-${podcastKey}-${episodeId}`,
            podcastId: podcast.collectionId,
            podcastTitle: podcast.collectionName,
            podcastArtwork: podcast.artworkUrl600 || podcast.artworkUrl100,
            episodeTitle,
            episodeId,
            timestamp: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
            read: false,
          });
        } catch (e) {
          // Skip failed feeds silently
        }
      }

      await AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(lastSeen));

      if (newNotifications.length > 0) {
        setNotifications(prev => {
          const merged = [...newNotifications, ...prev].slice(0, 50); // Keep last 50
          saveNotifications(merged);
          return merged;
        });
      }
    } catch (e) {
      console.error('Failed to refresh notifications:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [followedPodcasts, isRefreshing]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markRead,
      markAllRead,
      refreshNotifications,
      isRefreshing,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
