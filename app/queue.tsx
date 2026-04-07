import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Play,
  Shuffle,
  Trash2,
  Music2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { usePlayer } from '@/contexts/PlayerContext';
import { Episode } from '@/types/podcast';

const { width } = Dimensions.get('window');

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
};

export default function QueueScreen() {
  const router = useRouter();
  const {
    currentEpisode,
    currentPodcast,
    isPlaying,
    queue,
    setQueue,
    playEpisode,
    podcastEpisodes,
  } = usePlayer();

  const removeFromQueue = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQueue([]);
  };

  const shuffleQueue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQueue(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  // Get upcoming episodes from same podcast
  const getUpNextEpisodes = (): Episode[] => {
    if (!currentEpisode || !podcastEpisodes || podcastEpisodes.length === 0) return [];
    const currentIndex = podcastEpisodes.findIndex(e => e.id === currentEpisode.id);
    if (currentIndex === -1) return podcastEpisodes.slice(0, 5);
    return podcastEpisodes.slice(currentIndex + 1, currentIndex + 6);
  };

  const upNextEpisodes = getUpNextEpisodes();

  const renderQueueItem = ({ item, index }: { item: Episode; index: number }) => (
    <Pressable
      style={({ pressed }) => [styles.queueItem, pressed && { opacity: 0.7 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Play this episode and remove from queue
        const podcast = currentPodcast || {
          collectionId: -1,
          collectionName: item.podcastTitle || '',
          artistName: item.artistName || '',
          artworkUrl600: item.artwork || '',
          artworkUrl100: item.artwork || '',
          feedUrl: '',
          trackCount: 0,
          releaseDate: '',
          primaryGenreName: '',
          collectionViewUrl: '',
        };
        removeFromQueue(index);
        playEpisode(item, podcast);
      }}
    >
      <Image
        source={{ uri: item.artwork || currentPodcast?.artworkUrl600 }}
        style={styles.queueArtwork}
        contentFit="cover"
      />
      <View style={styles.queueInfo}>
        <Text style={styles.queueTitle} numberOfLines={2} textBreakStrategy="simple">{item.title}</Text>
        <Text style={styles.queueSubtitle} numberOfLines={1} textBreakStrategy="simple">
          {item.podcastTitle || currentPodcast?.collectionName}
          {item.duration > 0 ? ` · ${formatDuration(item.duration)}` : ''}
        </Text>
      </View>
      <Pressable
        onPress={() => removeFromQueue(index)}
        style={styles.removeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Trash2 color={Colors.accent} size={16} />
      </Pressable>
    </Pressable>
  );

  const renderUpNextItem = ({ item }: { item: Episode }) => (
    <Pressable
      style={({ pressed }) => [styles.queueItem, pressed && { opacity: 0.7 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentPodcast) {
          playEpisode(item, currentPodcast);
        }
      }}
    >
      <Image
        source={{ uri: item.artwork || currentPodcast?.artworkUrl600 }}
        style={styles.queueArtwork}
        contentFit="cover"
      />
      <View style={styles.queueInfo}>
        <Text style={styles.queueTitle} numberOfLines={2} textBreakStrategy="simple">{item.title}</Text>
        <Text style={styles.queueSubtitle} numberOfLines={1} textBreakStrategy="simple">
          {currentPodcast?.collectionName}
          {item.duration > 0 ? ` · ${formatDuration(item.duration)}` : ''}
        </Text>
      </View>
      <Play color={Colors.secondaryText} size={16} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft color={Colors.primaryText} size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Queue</Text>
          <View style={styles.headerActions}>
            {queue.length > 0 && (
              <>
                <Pressable onPress={shuffleQueue} style={styles.headerBtn}>
                  <Shuffle color={Colors.primaryText} size={18} />
                </Pressable>
                <Pressable onPress={clearQueue} style={styles.headerBtn}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        <FlatList
          data={queue.length > 0 ? queue : upNextEpisodes}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={queue.length > 0 ? renderQueueItem : renderUpNextItem as any}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Music2 color={Colors.secondaryText} size={48} />
              <Text style={styles.emptyTitle}>Your queue is empty</Text>
              <Text style={styles.emptySubtitle}>
                Add episodes from any podcast to build your listening queue
              </Text>
            </View>
          }
          ListHeaderComponent={
            <>
              {/* Now Playing */}
              {currentEpisode && currentPodcast && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Now Playing</Text>
                  <View style={styles.nowPlaying}>
                    <Image
                      source={{ uri: currentPodcast.artworkUrl600 }}
                      style={styles.nowPlayingArt}
                      contentFit="cover"
                    />
                    <View style={styles.nowPlayingInfo}>
                      <Text style={styles.nowPlayingTitle} numberOfLines={2} textBreakStrategy="simple">
                        {currentEpisode.title}
                      </Text>
                      <Text style={styles.nowPlayingSubtitle} numberOfLines={1} textBreakStrategy="simple">
                        {currentPodcast.collectionName}
                      </Text>
                    </View>
                    {isPlaying && (
                      <View style={styles.playingIndicator}>
                        <View style={[styles.bar, { height: 12 }]} />
                        <View style={[styles.bar, { height: 18 }]} />
                        <View style={[styles.bar, { height: 8 }]} />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Section Title for List */}
              {(queue.length > 0 || upNextEpisodes.length > 0) && (
                <View style={[styles.section, { paddingBottom: 0 }]}>
                  <Text style={styles.sectionTitle}>
                    {queue.length > 0 ? `Up Next · ${queue.length} episodes` : 'From This Podcast'}
                  </Text>
                </View>
              )}
            </>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primaryText,
    flex: 1,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.accentGlow,
  },
  nowPlayingArt: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryText,
    marginBottom: 3,
  },
  nowPlayingSubtitle: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  queueArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  queueInfo: {
    flex: 1,
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryText,
    marginBottom: 2,
  },
  queueSubtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
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
