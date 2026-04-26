import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, ViewStyle, AppState, AppStateStatus, Easing } from 'react-native';
import Colors from '@/constants/colors';

interface SkeletonProps {
  style?: ViewStyle | ViewStyle[];
}

export default function SkeletonLoader({ style }: SkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const startAnimation = () => {
    if (!animationRef.current) {
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    }
    animationRef.current.start();
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
  };

  useEffect(() => {
    // Start initially
    startAnimation();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        startAnimation();
      } else if (nextAppState.match(/inactive|background/)) {
        stopAnimation();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      stopAnimation();
    };
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.35],
  });

  return (
    <Animated.View style={[styles.skeleton, style, { opacity }]} />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
  },
});
