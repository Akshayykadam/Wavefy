import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function () {
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        console.log('Service: RemotePlay');
        TrackPlayer.play();
    });

    // Handle notification tap - do nothing here since app will open naturally
    // @ts-ignore - RemotePlayId exists in react-native-track-player
    TrackPlayer.addEventListener(Event.RemotePlayId, (event: { id: string }) => {
        console.log('Service: RemotePlayId', event.id);
        // No navigation needed here - the app opens normally
    });
    TrackPlayer.addEventListener(Event.RemotePause, () => {
        console.log('Service: RemotePause');
        TrackPlayer.pause();
    });
    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        console.log('Service: RemoteStop');
        TrackPlayer.reset();
    });
    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));

    // Handle next/previous track (for single-track, restart or no-op)
    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        // For now, no-op since we handle queue in PlayerContext
        // The PlayerContext useTrackPlayerEvents will handle the queue logic
    });
    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        const { position } = await TrackPlayer.getProgress();
        // If more than 5 seconds in, restart; otherwise no-op
        if (position > 5) {
            await TrackPlayer.seekTo(0);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
        const { position } = await TrackPlayer.getProgress();
        await TrackPlayer.seekTo(position + event.interval);
    });
    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
        const { position } = await TrackPlayer.getProgress();
        await TrackPlayer.seekTo(position - event.interval);
    });
};
