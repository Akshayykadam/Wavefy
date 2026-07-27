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
  Radio,
  Download,
  Bell,
  Heart,
  ListMusic,
  Search,
  Wifi,
  Play,
  ChevronRight,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';

const { width, height } = Dimensions.get('window');

const ONBOARDING_KEY = '@castbee_onboarding_complete';

interface OnboardingPage {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  gradient: string[];
  iconColor: string;
}

const PAGES: OnboardingPage[] = [
  {
    id: '1',
    title: 'Discover\nPodcasts',
    subtitle: 'Your audio universe awaits',
    description:
      'Explore thousands of podcasts across every genre — from true crime to tech, comedy to culture.',
    gradient: ['#FF3B30', '#FF6B6B'],
    iconColor: '#FF3B30',
  },
  {
    id: '2',
    title: 'Listen\nYour Way',
    subtitle: 'Built for how you listen',
    description:
      'Download for offline, build playlists, adjust playback speed, and pick up right where you left off.',
    gradient: ['#FF6B6B', '#FF3B30'],
    iconColor: '#FF6B6B',
  },
  {
    id: '3',
    title: 'Stay in\nthe Loop',
    subtitle: 'Never miss an episode',
    description:
      'Follow your favorites and get notified when new episodes drop. Your feed, always fresh.',
    gradient: ['#FF3B30', '#FF6B6B'],
    iconColor: '#FF3B30',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fade-in animations for each page
  const fadeAnims = useRef(PAGES.map(() => new Animated.Value(0))).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        setCurrentIndex(idx);
        // Animate in the new page content
        fadeAnims[idx].setValue(0);
        Animated.timing(fadeAnims[idx], {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    },
    [fadeAnims]
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
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  };

  const renderPageIcon = (pageIndex: number) => {
    const iconSize = 36;
    const iconColor = 'rgba(255,255,255,0.9)';

    if (pageIndex === 0) {
      return (
        <View style={styles.iconGrid}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,59,48,0.15)' }]}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={{ width: 80, height: 80, borderRadius: 20 }}
              contentFit="cover"
            />
          </View>
          <View style={styles.iconRow}>
            <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
              <Search color={Colors.accent} size={22} />
            </View>
            <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
              <Radio color={Colors.accentAlt} size={22} />
            </View>
            <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
              <Headphones color={Colors.accent} size={22} />
            </View>
          </View>
        </View>
      );
    }

    if (pageIndex === 1) {
      return (
        <View style={styles.iconGrid}>
          <View style={styles.iconRow}>
            <View style={[styles.featureCard]}>
              <Download color={Colors.accent} size={28} />
              <Text style={styles.featureLabel}>Offline</Text>
            </View>
            <View style={[styles.featureCard]}>
              <ListMusic color={Colors.accentAlt} size={28} />
              <Text style={styles.featureLabel}>Playlists</Text>
            </View>
          </View>
          <View style={styles.iconRow}>
            <View style={[styles.featureCard]}>
              <Play color={Colors.accent} size={28} />
              <Text style={styles.featureLabel}>Resume</Text>
            </View>
            <View style={[styles.featureCard]}>
              <Wifi color={Colors.accentAlt} size={28} />
              <Text style={styles.featureLabel}>Stream</Text>
            </View>
          </View>
        </View>
      );
    }

    // Page 3
    return (
      <View style={styles.iconGrid}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,59,48,0.15)' }]}>
          <Bell color={Colors.accent} size={48} />
        </View>
        <View style={styles.iconRow}>
          <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
            <Heart color={Colors.accentAlt} size={22} />
          </View>
          <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
            <Bell color={Colors.accent} size={22} />
          </View>
          <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
            <Radio color={Colors.accentAlt} size={22} />
          </View>
        </View>
      </View>
    );
  };

  const renderPage = ({ item, index }: { item: OnboardingPage; index: number }) => {
    return (
      <View style={[styles.page]}>
        <Animated.View
          style={[
            styles.pageContent,
            {
              opacity: fadeAnims[index],
              transform: [
                {
                  translateY: fadeAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Visual area */}
          <View style={styles.visualArea}>{renderPageIcon(index)}</View>

          {/* Text area */}
          <View style={styles.textArea}>
            <Text style={styles.pageSubtitle}>{item.subtitle}</Text>
            <Text style={styles.pageTitle}>{item.title}</Text>
            <Text style={styles.pageDescription}>{item.description}</Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotContainer}>
        {PAGES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: Colors.accent,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Trigger initial animation
  React.useEffect(() => {
    Animated.timing(fadeAnims[0], {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const isLastPage = currentIndex === PAGES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Skip button */}
        {!isLastPage && (
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}

        {/* Pages */}
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

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          {renderDots()}

          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              isLastPage && styles.getStartedButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleNext}
          >
            {isLastPage ? (
              <Text style={styles.getStartedText}>Get Started</Text>
            ) : (
              <View style={styles.nextContent}>
                <Text style={styles.nextText}>Next</Text>
                <ChevronRight color="#fff" size={18} />
              </View>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: Colors.secondaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  page: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  visualArea: {
    height: height * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  iconGrid: {
    alignItems: 'center',
    gap: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  smallIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.15)',
  },
  featureCard: {
    width: (width - 96) / 2,
    height: 90,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureLabel: {
    color: Colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textArea: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  pageSubtitle: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  pageTitle: {
    color: Colors.primaryText,
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  pageDescription: {
    color: Colors.secondaryText,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 300,
  },
  bottomControls: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 28,
    alignItems: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  getStartedButton: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  nextContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextText: {
    color: Colors.primaryText,
    fontSize: 17,
    fontWeight: '700',
  },
  getStartedText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
