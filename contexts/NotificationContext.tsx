import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useFollowedPodcasts } from './FollowedPodcastsContext';
import {
  NotificationItem,
  checkForNewEpisodes,
  registerBackgroundFetch,
  setupNotifications,
} from '@/utils/backgroundNotifications';

const STORAGE_KEY = 'wavefy_notifications';

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
  const hasInitialized = useRef(false);
  const isRefreshingRef = useRef(false);

  // Load stored notifications on mount
  useEffect(() => {
    loadNotifications();
  }, []);

  // Initialize notification system once
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    (async () => {
      // Set up notification permissions + Android channel
      await setupNotifications();

      // Register background fetch task
      await registerBackgroundFetch();

      // Configure how notifications are displayed when app is in foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    })();
  }, []);

  // Check for new episodes when followed podcasts change
  useEffect(() => {
    if (followedPodcasts.length > 0) {
      // Small delay to avoid blocking startup
      const timer = setTimeout(() => {
        refreshNotifications();
      }, 3000);
      return () => clearTimeout(timer);
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
    if (followedPodcasts.length === 0 || isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);

    try {
      const newItems = await checkForNewEpisodes();

      // Reload all notifications from storage (background task may have added some too)
      const storedRaw = await AsyncStorage.getItem(STORAGE_KEY);
      const allNotifs: NotificationItem[] = storedRaw ? JSON.parse(storedRaw) : [];
      setNotifications(allNotifs);
    } catch (e) {
      console.error('Failed to refresh notifications:', e);
    } finally {
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [followedPodcasts]);

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

  const unreadCount = React.useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

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
