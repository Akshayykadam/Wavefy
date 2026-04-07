import React, { useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Podcast } from '@/types/podcast';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.82;
const ITEM_SPACING = (width - ITEM_WIDTH) / 2;

interface HeroCarouselProps {
  podcasts: Podcast[];
}

export default function HeroCarousel({ podcasts }: HeroCarouselProps) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const handlePress = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/podcast/${id}` as any);
  };

  if (!podcasts || podcasts.length === 0) return null;

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={podcasts}
        keyExtractor={(item) => item.collectionId.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{ paddingHorizontal: ITEM_SPACING }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * ITEM_WIDTH,
            index * ITEM_WIDTH,
            (index + 1) * ITEM_WIDTH,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.92, 1, 0.92],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View style={[styles.itemContainer, { transform: [{ scale }], opacity }]}>
              <Pressable
                onPress={() => handlePress(item.collectionId)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed
                ]}
              >
                <Image
                  source={{ uri: item.artworkUrl600 }}
                  style={styles.artwork}
                  contentFit="cover"
                  transition={300}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={styles.gradientOverlay}
                >
                  <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>{item.collectionName}</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>{item.artistName}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: width * 0.68,
    marginTop: 4,
    marginBottom: 8,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: ITEM_WIDTH - 8,
    height: width * 0.58,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha05,
  },
  cardPressed: {
    opacity: 0.85,
  },
  artwork: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceLight,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  textContainer: {
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
});
