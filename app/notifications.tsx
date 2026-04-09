import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useNotifications } from '@/contexts/NotificationContext';

const timeAgo = (dateStr: string): string => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications();

  const renderItem = ({ item }: { item: typeof notifications[0] }) => (
    <Pressable
      style={({ pressed }) => [
        styles.notifItem,
        !item.read && styles.notifUnread,
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        markRead(item.id);
        router.push(`/podcast/${item.podcastId}` as any);
      }}
    >
      <Image
        source={{ uri: item.podcastArtwork }}
        style={styles.notifArtwork}
        contentFit="cover"
      />
      <View style={styles.notifContent}>
        <Text style={styles.notifPodcast} numberOfLines={1}>
          {item.podcastTitle}
        </Text>
        <Text style={styles.notifEpisode} numberOfLines={2}>
          New: {item.episodeTitle}
        </Text>
        <Text style={styles.notifTime}>{timeAgo(item.timestamp)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft color={Colors.primaryText} size={24} />
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                markAllRead();
              }}
              style={styles.markAllButton}
            >
              <CheckCheck color={Colors.accent} size={20} />
            </Pressable>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell color={Colors.secondaryText} size={48} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              Follow podcasts to get notified when new episodes drop
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primaryText,
    flex: 1,
    letterSpacing: -0.3,
  },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
    backgroundColor: Colors.surface,
  },
  notifUnread: {
    backgroundColor: Colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  notifArtwork: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
  },
  notifContent: {
    flex: 1,
  },
  notifPodcast: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryText,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  notifEpisode: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginBottom: 4,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: Colors.secondaryText,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryText,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
