import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Colors from '@/constants/colors';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 100
  color?: string;
  bgStrokeColor?: string;
  children?: React.ReactNode;
}

export default function CircularProgress({
  size = 24,
  strokeWidth = 2.5,
  progress = 0,
  color = Colors.accent,
  bgStrokeColor = 'rgba(255, 255, 255, 0.15)',
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Ensure progress is bounded between 1 and 100 for visible initial arc
  const validProgress = Math.min(Math.max(progress, 1), 100);
  const strokeDashoffset = circumference * (1 - validProgress / 100);

  return (
    <View style={[{ width: size, height: size }, styles.container]}>
      <Svg width={size} height={size}>
        {/* Background Track Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgStrokeColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Active Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children && <View style={styles.overlay}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
