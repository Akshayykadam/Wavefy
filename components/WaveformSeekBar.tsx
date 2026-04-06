import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, GestureResponderEvent } from 'react-native';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WaveformSeekBarProps {
    progress: number; // 0 to 1
    duration: number;
    onSeek: (position: number) => void;
    onSeekStart?: () => void;
    onSeekEnd?: () => void;
    height?: number;
    waveColor?: string;
    progressColor?: string;
    barCount?: number;
}

export default function WaveformSeekBar({
    progress,
    duration,
    onSeek,
    onSeekStart,
    onSeekEnd,
    height = 44,
    progressColor = Colors.accent,
}: WaveformSeekBarProps) {
    const containerWidth = SCREEN_WIDTH - 48;
    const TRACK_HEIGHT = 3;
    const THUMB_SIZE = 12;
    const THUMB_SIZE_ACTIVE = 16;

    const [isSeeking, setIsSeeking] = useState(false);
    const [seekProgress, setSeekProgress] = useState(0);
    const containerRef = useRef<View>(null);
    const containerLayoutRef = useRef({ x: 0, width: containerWidth });

    const calculateProgress = (pageX: number): number => {
        const relativeX = pageX - containerLayoutRef.current.x;
        return Math.max(0, Math.min(1, relativeX / containerLayoutRef.current.width));
    };

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (evt: GestureResponderEvent) => {
            setIsSeeking(true);
            onSeekStart?.();
            const newProgress = calculateProgress(evt.nativeEvent.pageX);
            setSeekProgress(newProgress);
        },

        onPanResponderMove: (evt: GestureResponderEvent) => {
            const newProgress = calculateProgress(evt.nativeEvent.pageX);
            setSeekProgress(newProgress);
        },

        onPanResponderRelease: (evt: GestureResponderEvent) => {
            const finalProgress = calculateProgress(evt.nativeEvent.pageX);
            const newPosition = finalProgress * duration;
            onSeek(newPosition);
            setIsSeeking(false);
            onSeekEnd?.();
        },

        onPanResponderTerminate: () => {
            setIsSeeking(false);
            onSeekEnd?.();
        },
    }), [duration, onSeek, onSeekStart, onSeekEnd]);

    const displayProgress = isSeeking ? seekProgress : progress;
    const thumbSize = isSeeking ? THUMB_SIZE_ACTIVE : THUMB_SIZE;
    const thumbPosition = displayProgress * containerWidth;

    return (
        <View
            ref={containerRef}
            style={[styles.container, { height }]}
            onLayout={() => {
                containerRef.current?.measure((_x, _y, width, _height, pageX) => {
                    containerLayoutRef.current = { x: pageX, width };
                });
            }}
            {...panResponder.panHandlers}
        >
            {/* Track background */}
            <View style={[styles.track, { height: TRACK_HEIGHT }]}>
                {/* Played portion */}
                <View
                    style={[
                        styles.trackFilled,
                        {
                            width: `${displayProgress * 100}%`,
                            height: TRACK_HEIGHT,
                            backgroundColor: progressColor,
                        },
                    ]}
                />
            </View>

            {/* Thumb */}
            <View
                style={[
                    styles.thumb,
                    {
                        width: thumbSize,
                        height: thumbSize,
                        borderRadius: thumbSize / 2,
                        left: thumbPosition - thumbSize / 2,
                        backgroundColor: progressColor,
                        transform: [{ scale: isSeeking ? 1.2 : 1 }],
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    track: {
        width: '100%',
        backgroundColor: Colors.whiteAlpha20,
        borderRadius: 2,
        overflow: 'hidden',
    },
    trackFilled: {
        borderRadius: 2,
    },
    thumb: {
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
});
