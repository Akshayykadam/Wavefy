import { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import createContextHook from '@nkzw/create-context-hook';

export const [NetworkProvider, useNetwork] = createContextHook(() => {
  const [isConnected, setIsConnected] = useState(true); // optimistic default
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? true);
    });

    // Subscribe to real-time changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? null);
    });

    return () => unsubscribe();
  }, []);

  // Convenience: true when we're confident there's no internet
  const isOffline = !isConnected || isInternetReachable === false;

  return {
    isConnected,
    isInternetReachable,
    isOffline,
  };
});
