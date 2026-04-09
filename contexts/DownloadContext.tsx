import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Episode, Podcast } from '@/types/podcast';
import createContextHook from '@nkzw/create-context-hook';

const DOWNLOADS_STORAGE_KEY = 'podcat_downloads_metadata';
const DOWNLOAD_DIR = FileSystem.documentDirectory + 'downloads/';

export type DownloadStatus = 'downloading' | 'completed' | 'failed';

export interface DownloadedEpisode extends Episode {
    localUri: string;
    downloadDate: string;
    status: DownloadStatus;
    progress: number; // 0 to 100
    podcastName: string; // Store podcast name for context
    podcastArtwork: string; // Store artwork for context
}

export const [DownloadProvider, useDownloads] = createContextHook(() => {
    const [downloads, setDownloads] = useState<{ [id: string]: DownloadedEpisode }>({});
    const downloadResumables = useRef<{ [id: string]: any }>({}); // Use any for simpler TS handling with Expo
    const downloadProgressThrottle = useRef<{ [id: string]: number }>({});

    // Ensure download directory exists
    useEffect(() => {
        (async () => {
            const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
            }
            loadDownloads();
        })();
    }, []);

    const loadDownloads = async () => {
        try {
            const json = await AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY);
            if (json) {
                const savedDownloads = JSON.parse(json);
                const sanitized: { [id: string]: DownloadedEpisode } = {};
                Object.values(savedDownloads as { [id: string]: DownloadedEpisode }).forEach(d => {
                    if (d.status === 'downloading') {
                        d.status = 'failed';
                        d.progress = 0;
                    }
                    sanitized[d.id] = d;
                });
                setDownloads(sanitized);
            }
        } catch (e) {
            console.error('Failed to load downloads', e);
        }
    };

    const saveDownloads = async (newDownloads: { [id: string]: DownloadedEpisode }) => {
        try {
            setDownloads(newDownloads);
            await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(newDownloads));
        } catch (e) {
            console.error('Failed to save downloads', e);
        }
    };

    // Ref to latest downloads state — avoids stale closure in downloadEpisode
    const downloadsRef = useRef(downloads);
    useEffect(() => { downloadsRef.current = downloads; }, [downloads]);

    const downloadEpisode = useCallback(async (episode: Episode, podcast: Podcast) => {
        // Use ref to get latest state \u2014 the [] deps mean this callback never re-creates,
        // but we still need to check current downloads to avoid re-downloading.
        if (downloadsRef.current[episode.id] && downloadsRef.current[episode.id].status === 'completed') {
            return; // Already downloaded
        }

        const filename = `${episode.id.replace(/[^a-z0-9]/gi, '_')}.mp3`;
        const localUri = DOWNLOAD_DIR + filename;

        // Initialize download entry
        const newEntry: DownloadedEpisode = {
            ...episode,
            localUri,
            downloadDate: new Date().toISOString(),
            status: 'downloading',
            progress: 1, // Start at 1% to show spinner immediately
            podcastName: podcast.collectionName,
            podcastArtwork: podcast.artworkUrl600,
        };

        setDownloads(prev => ({ ...prev, [episode.id]: newEntry }));

        const callback = (downloadProgress: any) => {
            const now = Date.now();
            // Throttle re-renders to at most once per second per episode
            if (now - (downloadProgressThrottle.current[episode.id] || 0) < 1000) return;
            downloadProgressThrottle.current[episode.id] = now;

            const calculatedProgress = downloadProgress.totalBytesExpectedToWrite > 0
                ? (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
                : 0;
            const progress = Math.max(1, calculatedProgress);

            setDownloads(prev => {
                const current = prev[episode.id];
                if (!current) return prev;
                return {
                    ...prev,
                    [episode.id]: { ...current, progress, status: 'downloading' }
                };
            });
        };

        const downloadResumable = FileSystem.createDownloadResumable(
            episode.audioUrl,
            localUri,
            {},
            callback
        );

        downloadResumables.current[episode.id] = downloadResumable;

        try {
            const result = await downloadResumable.downloadAsync();
            if (result && result.uri) {
                const completeEntry: DownloadedEpisode = {
                    ...newEntry,
                    status: 'completed',
                    progress: 100,
                    localUri: result.uri,
                };

                setDownloads(prev => {
                    const updated = { ...prev, [episode.id]: completeEntry };
                    saveDownloads(updated);
                    return updated;
                });
            }
        } catch (e) {
            console.error('Download failed', e);
            setDownloads(prev => {
                const failedEntry = { ...prev[episode.id], status: 'failed' as DownloadStatus, progress: 0 };
                return { ...prev, [episode.id]: failedEntry };
            });
        } finally {
            delete downloadResumables.current[episode.id];
        }
    }, []);

    const deleteDownload = useCallback(async (episodeId: string) => {
        if (downloadResumables.current[episodeId]) {
            try {
                await downloadResumables.current[episodeId].cancelAsync();
            } catch (e) { }
            delete downloadResumables.current[episodeId];
        }

        const entry = downloads[episodeId];
        if (entry && entry.localUri) {
            try {
                const info = await FileSystem.getInfoAsync(entry.localUri);
                if (info.exists) {
                    await FileSystem.deleteAsync(entry.localUri);
                }
            } catch (e) {
                console.error('Failed to delete file', e);
            }
        }

        setDownloads(prev => {
            const updated = { ...prev };
            delete updated[episodeId];
            AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updated)).catch(() => { });
            return updated;
        });
    }, [downloads]);

    const isDownloaded = useCallback((episodeId: string) => {
        return downloads[episodeId]?.status === 'completed';
    }, [downloads]);

    const getDownloadProgress = useCallback((episodeId: string) => {
        return downloads[episodeId]?.progress || 0;
    }, [downloads]);

    return {
        downloads,
        downloadEpisode,
        deleteDownload,
        isDownloaded,
        getDownloadProgress,
    };
});
