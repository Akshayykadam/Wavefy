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
  Sparkles,
  Headphones,
  Bell,
  ArrowRight,
  Download,
  Sliders,
  Radio,
  Zap,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { setupNotifications, registerBackgroundFetch } from '@/utils/backgroundNotifications';

const { width, height } = Dimensions.get('window');

const ONBOARDING_KEY = '@castbee_onboarding_complete';

interface OnboardingItem {
  id: string;
  badge: string;
  title: string;
  highlightText: string;
  description: string;
}

const PAGES: OnboardingItem[] = [
  {
    id: '1',
    badge: 'CASTBEE PODCASTS',
    title: 'Stories that',
    highlightText: 'buzz.',
    description: 'Explore millions of podcasts, trending charts, and daily releases tailored to your taste.',
  },
  {
    id: '2',
    badge: 'TAILORED LISTENING',
    title: 'Audio on your',
    highlightText: 'terms.',
    description: 'Seamless offline downloads, custom playback queueing, and smart speed controls.',
  },
  {
    id: '3',
    badge: 'STAY CONNECTED',
    title: 'Never miss an',
    highlightText: 'episode.',
    description: 'Follow your favorite creators and get notified the moment fresh episodes drop.',
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
          {/* Ambient Glow */}
          <View style={styles.glowBg} />
          <View style={styles.heroCard}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logoImage}
              contentFit="cover"
            />
          </View>
          {/* Subtle floating pills */}
          <View style={styles.floatingPillContainer}>
            <View style={styles.pillTag}>
              <Sparkles size={12} color={Colors.accent} />
              <Text style={styles.pillTagText}>Trending Shows</Text>
            </View>
            <View style={[styles.pillTag, { backgroundColor: Colors.surfaceElevated }]}>
              <Radio size={12} color={Colors.accentAlt} />
              <Text style={styles.pillTagText}>High Quality</Text>
            </View>
          </View>
        </View>
      );
    }

    if (index === 1) {
      return (
        <View style={styles.visualContainer}>
          <View style={[styles.glowBg, { backgroundColor: 'rgba(255, 107, 107, 0.12)' }]} />
          <View style={styles.featureGrid}>
            <View style={styles.featureRow}>
              <View style={styles.featureBox}>
                <Download size={24} color={Colors.accent} />
                <Text style={styles.featureBoxTitle}>Offline</Text>
                <Text style={styles.featureBoxSub}>Listen anywhere</Text>
              </View>
              <View style={styles.featureBox}>
                <Sliders size={24} color={Colors.accentAlt} />
                <Text style={styles.featureBoxTitle}>Speed</Text>
                <Text style={styles.featureBoxSub}>0.5x to 3.0x</Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureBox}>
                <Headphones size={24} color={Colors.accentAlt} />
                <Text style={styles.featureBoxTitle}>Auto-Queue</Text>
                <Text style={styles.featureBoxSub}>Continuous audio</Text>
              </View>
              <View style={styles.featureBox}>
                <Zap size={24} color={Colors.accent} />
                <Text style={styles.featureBoxTitle}>Instant</Text>
                <Text style={styles.featureBoxSub}>Zero buffering</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Index 2
    return (
      <View style={styles.visualContainer}>
        <View style={styles.glowBg} />
        <View style={styles.bellCard}>
          <View style={styles.bellIconCircle}>
            <Bell size={44} color={Colors.accent} />
          </View>
          <View style={styles.notificationPreview}>
            <View style={styles.notifDot} />
            <Text style={styles.notifText}>New Episode Out Now</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPage = ({ item, index }: { item: OnboardingItem; index: number }) => {
    return (
      <View style={styles.page}>
        {/* Upper visual display */}
        <View style={styles.visualSection}>{renderVisual(index)}</View>

        {/* Lower typography section */}
        <View style={styles.textSection}>
          <View style={styles.badgeView}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>

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
            <Text style={styles.brandName}>CastBee</Text>
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
    fontSize: 17,
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
    paddingBottom: 16,
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
    position: 'relative',
  },
  glowBg: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.accentGlow20,
  },
  heroCard: {
    width: 130,
    height: 130,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  floatingPillContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  pillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryText,
  },
  featureGrid: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  featureBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryText,
    marginTop: 4,
  },
  featureBoxSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '500',
  },
  bellCard: {
    alignItems: 'center',
    gap: 20,
  },
  bellIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  notificationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  notifText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryText,
  },
  textSection: {
    flex: 0.9,
    justifyContent: 'flex-start',
  },
  badgeView: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,59,48,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 1.2,
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
    lineHeight: 23,
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
