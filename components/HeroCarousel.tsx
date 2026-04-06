import React, { useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Podcast } from '@/types/podcast';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.75;
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
            outputRange: [0.85, 1, 0.85],
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
                />
                <View style={styles.textContainer}>
                  <Text style={styles.title} numberOfLines={1}>{item.collectionName}</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>{item.artistName}</Text>
                </View>
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
    height: ITEM_WIDTH + 80,
    marginTop: 8,
    marginBottom: 24,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: ITEM_WIDTH - 20,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  cardPressed: {
    opacity: 0.8,
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
  },
  textContainer: {
    marginTop: 16,
    marginBottom: 4,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryText,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
});
