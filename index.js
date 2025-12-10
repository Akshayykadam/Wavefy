import TrackPlayer from 'react-native-track-player';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Register the service BEFORE any other app logic
TrackPlayer.registerPlaybackService(() => require('./service'));

// Must be exported or imported to be picked up
import 'expo-router/entry';
