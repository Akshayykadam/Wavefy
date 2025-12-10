import { Link, Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import TrackPlayer, { State } from "react-native-track-player";

export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect: if there's audio playing, go to player; otherwise go home
    const checkAndRedirect = async () => {
      try {
        const playbackState = await TrackPlayer.getPlaybackState();
        const state = (playbackState as any).state || playbackState;

        // If playing, buffering, or paused with a track, go to player
        if (state === State.Playing || state === State.Paused || state === State.Buffering) {
          router.replace("/player");
        } else {
          router.replace("/");
        }
      } catch (e) {
        // TrackPlayer not initialized, go home
        router.replace("/");
      }
    };

    // Small delay to ensure navigation state is ready
    const timeout = setTimeout(checkAndRedirect, 100);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Redirecting...</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: Colors.black,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: Colors.primaryText,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: Colors.accent,
  },
});
