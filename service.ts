import TrackPlayer, { Event } from 'react-native-track-player';

export default async function playbackService() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play().catch(() => {});
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause().catch(() => {});
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        TrackPlayer.reset().catch(() => {});
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        if (event && typeof event.position === 'number') {
            TrackPlayer.seekTo(event.position).catch(() => {});
        }
    });

    TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
        try {
            const { position } = await TrackPlayer.getProgress();
            const interval = event?.interval || 10;
            await TrackPlayer.seekTo(position + interval);
        } catch {
            // silent catch
        }
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
        try {
            const { position } = await TrackPlayer.getProgress();
            const interval = event?.interval || 10;
            await TrackPlayer.seekTo(Math.max(0, position - interval));
        } catch {
            // silent catch
        }
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        try {
            const queue = await TrackPlayer.getQueue();
            const activeIndex = await TrackPlayer.getActiveTrackIndex();
            if (activeIndex !== undefined && queue && activeIndex < queue.length - 1) {
                await TrackPlayer.skipToNext();
            } else {
                const { position } = await TrackPlayer.getProgress();
                await TrackPlayer.seekTo(position + 10);
            }
        } catch {
            // silent catch
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        try {
            const { position } = await TrackPlayer.getProgress();
            if (position > 5) {
                await TrackPlayer.seekTo(0);
            } else {
                const activeIndex = await TrackPlayer.getActiveTrackIndex();
                if (activeIndex !== undefined && activeIndex > 0) {
                    await TrackPlayer.skipToPrevious();
                } else {
                    await TrackPlayer.seekTo(0);
                }
            }
        } catch {
            // silent catch
        }
    });

    TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
        if (event.permanent || event.paused) {
            TrackPlayer.pause().catch(() => {});
        } else {
            TrackPlayer.play().catch(() => {});
        }
    });
}


