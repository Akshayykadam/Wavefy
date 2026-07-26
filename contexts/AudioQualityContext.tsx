import React, { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoCellularGeneration } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import TrackPlayer from 'react-native-track-player';

export type QualityMode = 'auto' | 'high' | 'medium' | 'low';
export type EffectiveQuality = 'high' | 'medium' | 'low';

const STORAGE_KEY = '@castbee_audio_quality_mode';

export const [AudioQualityProvider, useAudioQuality] = createContextHook(() => {
  const [qualityMode, setQualityModeState] = useState<QualityMode>('auto');
  const [networkType, setNetworkType] = useState<string>('wifi');
  const [cellularGen, setCellularGen] = useState<NetInfoCellularGeneration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && ['auto', 'high', 'medium', 'low'].includes(saved)) {
        setQualityModeState(saved as QualityMode);
      }
      setIsLoading(false);
    });
  }, []);

  // Monitor Network
  useEffect(() => {
    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkType(state.type);
      if (state.type === 'cellular' && state.details) {
        setCellularGen((state.details as any).cellularGeneration || null);
      }
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkType(state.type);
      if (state.type === 'cellular' && state.details) {
        setCellularGen((state.details as any).cellularGeneration || null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Compute effective quality based on network + user setting
  const getEffectiveQuality = (): EffectiveQuality => {
    if (qualityMode !== 'auto') {
      return qualityMode;
    }

    if (networkType === 'wifi' || networkType === 'ethernet') {
      return 'high';
    }

    if (networkType === 'cellular') {
      if (cellularGen === '5g') return 'high';
      if (cellularGen === '4g') return 'medium';
      if (cellularGen === '3g' || cellularGen === '2g') return 'low';
      return 'medium';
    }

    return 'medium';
  };

  const effectiveQuality = getEffectiveQuality();

  // Apply track player buffer settings when quality changes
  useEffect(() => {
    try {
      if (effectiveQuality === 'high') {
        TrackPlayer.updateOptions({
          progressUpdateEventInterval: 1,
        }).catch(() => {});
      } else if (effectiveQuality === 'medium') {
        TrackPlayer.updateOptions({
          progressUpdateEventInterval: 2,
        }).catch(() => {});
      } else {
        TrackPlayer.updateOptions({
          progressUpdateEventInterval: 3,
        }).catch(() => {});
      }
    } catch {}
  }, [effectiveQuality]);

  const setQualityMode = useCallback(async (mode: QualityMode) => {
    setQualityModeState(mode);
    await AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return {
    qualityMode,
    effectiveQuality,
    networkType,
    cellularGen,
    setQualityMode,
    isLoading,
  };
});
