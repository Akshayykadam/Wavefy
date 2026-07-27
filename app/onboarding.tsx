import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  Animated,
  StatusBar,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  Headphones,
  Bell,
  ArrowRight,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { setupNotifications, registerBackgroundFetch } from '@/utils/backgroundNotifications';

const { width } = Dimensions.get('window');

const ONBOARDING_KEY = '@wavefy_onboarding_complete';

interface OnboardingItem {
  id: string;
  title: string;
  highlightText: string;
  description: string;
}

const PAGES: OnboardingItem[] = [
  {
    id: '1',
    title: 'Listen',
    highlightText: 'everywhere.',
    description: 'Stream seamlessly or download podcasts for offline listening anytime, anywhere.',
  },
  {
    id: '2',
    title: 'Discover',
    highlightText: 'new audio.',
    description: 'Explore top charts, curated categories, and daily recommendations tailored to your taste.',
  },
  {
    id: '3',
    title: 'Repeat',
    highlightText: 'your favorites.',
    description: 'Follow your top shows, build custom playlists, and get notified when new episodes drop.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      // 1. Save onboarding completion status
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      await AsyncStorage.setItem('@castbee_onboarding_complete', 'true');
      
      // 2. ONLY NOW request notification permissions after completing onboarding
      await setupNotifications();
      await registerBackgroundFetch();
    } catch (e) {
      console.error('[Onboarding] Completion error:', e);
    } finally {
      // 3. Navigate to main tabs
      router.replace('/(tabs)');
    }
  };

  const renderVisual = (index: number) => {
    if (index === 0) {
      return (
        <View style={styles.visualContainer}>
          <View style={styles.heroCard}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logoImage}
              contentFit="cover"
            />
          </View>
        </View>
      );
    }

    if (index === 1) {
      return (
        <View style={styles.visualContainer}>
          <View style={styles.heroCard}>
            <Headphones size={64} color={Colors.accent} />
          </View>
        </View>
      );
    }

    // Index 2
    return (
      <View style={styles.visualContainer}>
        <View style={styles.heroCard}>
          <Bell size={64} color={Colors.accent} />
        </View>
      </View>
    );
  };

  const renderPage = ({ item, index }: { item: OnboardingItem; index: number }) => {
    return (
      <View style={styles.page}>
        {/* Upper visual display - single big icon */}
        <View style={styles.visualSection}>{renderVisual(index)}</View>

        {/* Lower typography section - no badge chip text */}
        <View style={styles.textSection}>
          <Text style={styles.titleText}>
            {item.title}{' '}
            <Text style={styles.highlightText}>{item.highlightText}</Text>
          </Text>

          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const isLastPage = currentIndex === PAGES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.smallDot} />
            <Text style={styles.brandName}>Wavefy</Text>
          </View>
          {!isLastPage && (
            <Pressable
              style={({ pressed }) => [
                styles.skipBtn,
                pressed && { opacity: 0.6 },
              ]}
              onPress={handleSkip}
            >
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>
          )}
        </View>

        {/* Swipeable Pages */}
        <FlatList
          ref={flatListRef}
          data={PAGES}
          renderItem={renderPage}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        {/* Bottom Bar Controls */}
        <View style={styles.footer}>
          {/* Pagination Indicators */}
          <View style={styles.paginationRow}>
            {PAGES.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [6, 20, 6],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.25, 1, 0.25],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity,
                      backgroundColor: Colors.accent,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              isLastPage && styles.getStartedButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>
              {isLastPage ? 'Get Started' : 'Continue'}
            </Text>
            <ArrowRight size={18} color="#FFF" style={{ marginLeft: 6 }} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 12,
    height: 48,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryText,
    letterSpacing: -0.3,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  page: {
    width,
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  visualSection: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 104,
    height: 104,
    borderRadius: 26,
  },
  textSection: {
    flex: 0.9,
    justifyContent: 'flex-start',
  },
  titleText: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.primaryText,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  highlightText: {
    color: Colors.accent,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.secondaryText,
    fontWeight: '400',
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    gap: 20,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButton: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
