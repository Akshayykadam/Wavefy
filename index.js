import TrackPlayer from 'react-native-track-player';
import playbackService from './service';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Register the service BEFORE any other app logic
TrackPlayer.registerPlaybackService(() => playbackService);

// Invoke playbackService immediately so event listeners register on app launch
playbackService().catch(err => console.warn('playbackService init error:', err));

// Must be exported or imported to be picked up
import 'expo-router/entry';


