import TrackPlayer, { Event } from 'react-native-track-player';

async function playbackService() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        console.log('Service: RemotePlay');
        TrackPlayer.play().catch(err => console.warn('TrackPlayer play error:', err));
    });

    // Handle notification tap
    TrackPlayer.addEventListener(Event.RemotePlayId, (event: { id: string }) => {
        console.log('Service: RemotePlayId', event?.id);
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        console.log('Service: RemotePause');
        TrackPlayer.pause().catch(err => console.warn('TrackPlayer pause error:', err));
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        console.log('Service: RemoteStop');
        TrackPlayer.reset().catch(err => console.warn('TrackPlayer reset error:', err));
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        if (event && typeof event.position === 'number') {
            TrackPlayer.seekTo(event.position).catch(err => console.warn('TrackPlayer seek error:', err));
        }
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        // Queue handling in PlayerContext
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        try {
            const { position } = await TrackPlayer.getProgress();
            if (position > 5) {
                await TrackPlayer.seekTo(0);
            }
        } catch (err) {
            console.warn('TrackPlayer previous error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
        try {
            const { position } = await TrackPlayer.getProgress();
            const interval = event?.interval || 15;
            await TrackPlayer.seekTo(position + interval);
        } catch (err) {
            console.warn('TrackPlayer jump forward error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
        try {
            const { position } = await TrackPlayer.getProgress();
            const interval = event?.interval || 15;
            await TrackPlayer.seekTo(Math.max(0, position - interval));
        } catch (err) {
            console.warn('TrackPlayer jump backward error:', err);
        }
    });
}

module.exports = playbackService;
export default playbackService;
