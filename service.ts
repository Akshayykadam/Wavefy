import TrackPlayer, { Event } from 'react-native-track-player';

export default async function playbackService() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        console.log('[PlaybackService] RemotePlay');
        TrackPlayer.play().catch(err => console.warn('[PlaybackService] play error:', err));
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        console.log('[PlaybackService] RemotePause');
        TrackPlayer.pause().catch(err => console.warn('[PlaybackService] pause error:', err));
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        console.log('[PlaybackService] RemoteStop');
        TrackPlayer.reset().catch(err => console.warn('[PlaybackService] stop error:', err));
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        console.log('[PlaybackService] RemoteSeek:', event.position);
        if (event && typeof event.position === 'number') {
            TrackPlayer.seekTo(event.position).catch(err => console.warn('[PlaybackService] seek error:', err));
        }
    });

    TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
        console.log('[PlaybackService] RemoteJumpForward');
        try {
            const { position } = await TrackPlayer.getProgress();
            const interval = event?.interval || 10;
            await TrackPlayer.seekTo(position + interval);
        } catch (err) {
            console.warn('[PlaybackService] jump forward error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
        console.log('[PlaybackService] RemoteJumpBackward');
        try {
            const { position } = await TrackPlayer.getProgress();
            const interval = event?.interval || 10;
            await TrackPlayer.seekTo(Math.max(0, position - interval));
        } catch (err) {
            console.warn('[PlaybackService] jump backward error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        console.log('[PlaybackService] RemoteNext');
        try {
            const queue = await TrackPlayer.getQueue();
            const activeIndex = await TrackPlayer.getActiveTrackIndex();
            if (activeIndex !== undefined && queue && activeIndex < queue.length - 1) {
                await TrackPlayer.skipToNext();
            } else {
                const { position } = await TrackPlayer.getProgress();
                await TrackPlayer.seekTo(position + 10);
            }
        } catch (err) {
            console.warn('[PlaybackService] RemoteNext error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        console.log('[PlaybackService] RemotePrevious');
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
        } catch (err) {
            console.warn('[PlaybackService] RemotePrevious error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
        console.log('[PlaybackService] RemoteDuck:', event);
        if (event.permanent || event.paused) {
            TrackPlayer.pause().catch(err => console.warn('[PlaybackService] duck pause error:', err));
        } else {
            TrackPlayer.play().catch(err => console.warn('[PlaybackService] duck play error:', err));
        }
    });
}

