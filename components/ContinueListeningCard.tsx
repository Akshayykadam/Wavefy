import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

const CARD_WIDTH = Dimensions.get('window').width * 0.36;
const RING_SIZE = 48;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface ContinueListeningCardProps {
  episodeTitle: string;
  podcastTitle: string;
  artwork: string;
  progress: number; // 0 to 1
  onPress: () => void;
}

export default function ContinueListeningCard({
  episodeTitle,
  podcastTitle,
  artwork,
  progress,
  onPress,
}: ContinueListeningCardProps) {
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - Math.min(progress, 1));
  const progressPercent = Math.round(Math.min(progress, 1) * 100);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={styles.artworkContainer}>
        <Image source={{ uri: artwork }} style={styles.artwork} contentFit="cover" transition={200} />
        {/* Circular progress ring */}
        <View style={styles.ringOverlay}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={Colors.whiteAlpha20}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={Colors.accent}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={`${RING_CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.playOverlay}>
            <Play color="#fff" size={14} fill="#fff" />
          </View>
        </View>
      </View>
      <Text style={styles.episodeTitle} numberOfLines={2} textBreakStrategy="simple">{episodeTitle}</Text>
      <Text style={styles.podcastTitle} numberOfLines={1} textBreakStrategy="simple">{podcastTitle}</Text>
      <Text style={styles.progressText}>{progressPercent}% played</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  artworkContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: Colors.surface,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  ringOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: RING_SIZE / 2,
  },
  playOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryText,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  podcastTitle: {
    fontSize: 11,
    color: Colors.secondaryText,
    letterSpacing: -0.1,
  },
  progressText: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: -0.1,
  },
});
