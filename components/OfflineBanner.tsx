import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { WifiOff, Wifi } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useNetwork } from '@/contexts/NetworkContext';

export default function OfflineBanner() {
  const { isOffline } = useNetwork();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [isReconnected, setIsReconnected] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOffline) {
      // Going offline
      setShowBanner(true);
      setIsReconnected(false);
      setWasOffline(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 25,
      }).start();
    } else if (wasOffline) {
      // Coming back online
      setIsReconnected(true);

      // Show "back online" briefly, then hide
      hideTimer.current = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -80,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowBanner(false);
          setWasOffline(false);
          setIsReconnected(false);
        });
      }, 2500);
    }

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isOffline]);

  if (!showBanner) return null;

  const bannerTop = Platform.OS === 'ios' ? insets.top : insets.top + 4;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: bannerTop,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.banner,
          isReconnected ? styles.bannerOnline : styles.bannerOffline,
        ]}
      >
        {isReconnected ? (
          <Wifi color="#fff" size={14} />
        ) : (
          <WifiOff color="#fff" size={14} />
        )}
        <Text style={styles.text}>
          {isReconnected ? 'Back online' : "You're offline"}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  bannerOffline: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  bannerOnline: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
