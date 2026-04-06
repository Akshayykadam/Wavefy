import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Clock, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Chapter } from '@/types/podcast';

interface ChapterListProps {
  chapters: Chapter[];
  currentPosition: number; // in milliseconds
  onSeek: (position: number) => void; // expects milliseconds
}

const formatChapterTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ChapterList({ chapters, currentPosition, onSeek }: ChapterListProps) {
  if (!chapters || chapters.length === 0) return null;

  const positionSec = currentPosition / 1000;

  // Find active chapter
  const activeIndex = chapters.reduce((active, ch, idx) => {
    if (positionSec >= ch.startTime) return idx;
    return active;
  }, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Clock color={Colors.secondaryText} size={16} />
        <Text style={styles.headerTitle}>Chapters</Text>
        <Text style={styles.headerCount}>{chapters.length}</Text>
      </View>
      <ScrollView
        style={styles.list}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {chapters.map((chapter, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable
              key={`ch-${index}`}
              style={({ pressed }) => [
                styles.chapterItem,
                isActive && styles.chapterItemActive,
                pressed && styles.chapterItemPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSeek(chapter.startTime * 1000);
              }}
            >
              <View style={[styles.indexBadge, isActive && styles.indexBadgeActive]}>
                {isActive ? (
                  <Play color="#fff" size={10} fill="#fff" />
                ) : (
                  <Text style={styles.indexText}>{index + 1}</Text>
                )}
              </View>
              <View style={styles.chapterInfo}>
                <Text
                  style={[styles.chapterTitle, isActive && styles.chapterTitleActive]}
                  numberOfLines={2}
                >
                  {chapter.title}
                </Text>
                <Text style={styles.chapterTime}>
                  {formatChapterTime(chapter.startTime)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryText,
    flex: 1,
  },
  headerCount: {
    fontSize: 13,
    color: Colors.secondaryText,
    backgroundColor: Colors.whiteAlpha10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  list: {
    maxHeight: 240,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 12,
    marginBottom: 2,
  },
  chapterItemActive: {
    backgroundColor: Colors.whiteAlpha10,
  },
  chapterItemPressed: {
    opacity: 0.7,
  },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexBadgeActive: {
    backgroundColor: Colors.accent,
  },
  indexText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primaryText,
    marginBottom: 2,
  },
  chapterTitleActive: {
    color: Colors.accent,
    fontWeight: '600',
  },
  chapterTime: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
});
