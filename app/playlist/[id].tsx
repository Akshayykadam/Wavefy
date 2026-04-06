import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Play,
  Shuffle,
  Trash2,
  Music2,
  MoreVertical,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { usePlaylist } from '@/contexts/PlaylistContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Episode } from '@/types/podcast';

const { width } = Dimensions.get('window');

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
};

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPlaylist, removeFromPlaylist, deletePlaylist } = usePlaylist();
  const { playEpisode, addToQueue } = usePlayer();

  const playlist = getPlaylist(id || '');

  if (!playlist) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color={Colors.primaryText} size={24} />
          </Pressable>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Playlist not found</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const totalDuration = playlist.episodes.reduce((sum, ep) => sum + (ep.duration || 0), 0);

  const playAll = () => {
    if (playlist.episodes.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const [first, ...rest] = playlist.episodes;
    const podcast = {
      collectionId: -1,
      collectionName: first.podcastTitle || playlist.name,
      artistName: first.artistName || '',
      artworkUrl600: first.artwork || '',
      artworkUrl100: first.artwork || '',
      feedUrl: '',
      trackCount: 0,
      releaseDate: '',
      primaryGenreName: '',
      collectionViewUrl: '',
    };
    playEpisode(first, podcast);
    rest.forEach(ep => addToQueue(ep));
  };

  const shufflePlay = () => {
    if (playlist.episodes.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const shuffled = [...playlist.episodes].sort(() => Math.random() - 0.5);
    const [first, ...rest] = shuffled;
    const podcast = {
      collectionId: -1,
      collectionName: first.podcastTitle || playlist.name,
      artistName: first.artistName || '',
      artworkUrl600: first.artwork || '',
      artworkUrl100: first.artwork || '',
      feedUrl: '',
      trackCount: 0,
      releaseDate: '',
      primaryGenreName: '',
      collectionViewUrl: '',
    };
    playEpisode(first, podcast);
    rest.forEach(ep => addToQueue(ep));
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(playlist.id);
            router.back();
          },
        },
      ]
    );
  };

  // Get up to 4 artworks for mosaic
  const artworks = playlist.episodes
    .slice(0, 4)
    .map(ep => ep.artwork)
    .filter(Boolean);

  const renderEpisode = ({ item, index }: { item: Episode; index: number }) => (
    <Pressable
      style={({ pressed }) => [styles.episodeItem, pressed && { opacity: 0.7 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const podcast = {
          collectionId: -1,
          collectionName: item.podcastTitle || playlist.name,
          artistName: item.artistName || '',
          artworkUrl600: item.artwork || '',
          artworkUrl100: item.artwork || '',
          feedUrl: '',
          trackCount: 0,
          releaseDate: '',
          primaryGenreName: '',
          collectionViewUrl: '',
        };
        playEpisode(item, podcast);
      }}
    >
      <Image
        source={{ uri: item.artwork || '' }}
        style={styles.episodeArt}
        contentFit="cover"
      />
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.episodeMeta} numberOfLines={1}>
          {item.podcastTitle || ''}
          {item.duration > 0 ? ` · ${formatDuration(item.duration)}` : ''}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          removeFromPlaylist(playlist.id, item.id);
        }}
        style={styles.removeBtn}
      >
        <Trash2 color={Colors.secondaryText} size={16} />
      </Pressable>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color={Colors.primaryText} size={24} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={handleDelete} style={styles.backButton}>
            <Trash2 color={Colors.accent} size={20} />
          </Pressable>
        </View>

        <FlatList
          data={playlist.episodes}
          renderItem={renderEpisode}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.playlistHeader}>
              {/* Artwork mosaic */}
              <View style={styles.mosaicContainer}>
                {artworks.length >= 4 ? (
                  <View style={styles.mosaic}>
                    {artworks.slice(0, 4).map((uri, i) => (
                      <Image key={i} source={{ uri }} style={styles.mosaicTile} contentFit="cover" />
                    ))}
                  </View>
                ) : artworks.length > 0 ? (
                  <Image source={{ uri: artworks[0] }} style={styles.singleArt} contentFit="cover" />
                ) : (
                  <View style={styles.emptyArt}>
                    <Music2 color={Colors.secondaryText} size={40} />
                  </View>
                )}
              </View>

              <Text style={styles.playlistName}>{playlist.name}</Text>
              <Text style={styles.playlistMeta}>
                {playlist.episodes.length} episode{playlist.episodes.length !== 1 ? 's' : ''}
                {totalDuration > 0 ? ` · ${formatDuration(totalDuration)}` : ''}
              </Text>

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [styles.playAllBtn, pressed && { opacity: 0.8 }]}
                  onPress={playAll}
                >
                  <Play color="#fff" size={18} fill="#fff" />
                  <Text style={styles.playAllText}>Play All</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.shuffleBtn, pressed && { opacity: 0.8 }]}
                  onPress={shufflePlay}
                >
                  <Shuffle color={Colors.primaryText} size={18} />
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Music2 color={Colors.secondaryText} size={36} />
              <Text style={styles.emptyTitle}>No episodes yet</Text>
              <Text style={styles.emptySubtitle}>
                Add episodes from the player or podcast pages
              </Text>
            </View>
          }
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
    paddingVertical: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  playlistHeader: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  mosaicContainer: {
    marginBottom: 20,
  },
  mosaic: {
    width: 180,
    height: 180,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    overflow: 'hidden',
    gap: 2,
  },
  mosaicTile: {
    width: 89,
    height: 89,
    backgroundColor: Colors.surface,
  },
  singleArt: {
    width: 180,
    height: 180,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  emptyArt: {
    width: 180,
    height: 180,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primaryText,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  playlistMeta: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  playAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  shuffleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  episodeArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryText,
    marginBottom: 2,
  },
  episodeMeta: {
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
    paddingTop: 40,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryText,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
