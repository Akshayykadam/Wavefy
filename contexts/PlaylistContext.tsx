import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Episode, PlaylistData } from '@/types/podcast';

const STORAGE_KEY = 'wavefy_playlists';

interface PlaylistContextType {
  playlists: PlaylistData[];
  createPlaylist: (name: string) => PlaylistData;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addToPlaylist: (playlistId: string, episode: Episode) => void;
  removeFromPlaylist: (playlistId: string, episodeId: string) => void;
  reorderPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => void;
  getPlaylist: (id: string) => PlaylistData | undefined;
}

const PlaylistContext = createContext<PlaylistContextType>({
  playlists: [],
  createPlaylist: () => ({ id: '', name: '', episodes: [], createdAt: '', updatedAt: '' }),
  deletePlaylist: () => {},
  renamePlaylist: () => {},
  addToPlaylist: () => {},
  removeFromPlaylist: () => {},
  reorderPlaylist: () => {},
  getPlaylist: () => undefined,
});

export function usePlaylist() {
  return useContext(PlaylistContext);
}

const generateId = () => `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<PlaylistData[]>([]);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setPlaylists(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to load playlists:', e);
    }
  };

  const savePlaylists = async (data: PlaylistData[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save playlists:', e);
    }
  };

  const createPlaylist = useCallback((name: string): PlaylistData => {
    const now = new Date().toISOString();
    const newPlaylist: PlaylistData = {
      id: generateId(),
      name,
      episodes: [],
      createdAt: now,
      updatedAt: now,
    };
    setPlaylists(prev => {
      const updated = [newPlaylist, ...prev];
      savePlaylists(updated);
      return updated;
    });
    return newPlaylist;
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => {
      const updated = prev.filter(p => p.id !== id);
      savePlaylists(updated);
      return updated;
    });
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists(prev => {
      const updated = prev.map(p =>
        p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
      );
      savePlaylists(updated);
      return updated;
    });
  }, []);

  const addToPlaylist = useCallback((playlistId: string, episode: Episode) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id !== playlistId) return p;
        // Don't add duplicates
        if (p.episodes.some(e => e.id === episode.id)) return p;
        return {
          ...p,
          episodes: [...p.episodes, episode],
          updatedAt: new Date().toISOString(),
        };
      });
      savePlaylists(updated);
      return updated;
    });
  }, []);

  const removeFromPlaylist = useCallback((playlistId: string, episodeId: string) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id !== playlistId) return p;
        return {
          ...p,
          episodes: p.episodes.filter(e => e.id !== episodeId),
          updatedAt: new Date().toISOString(),
        };
      });
      savePlaylists(updated);
      return updated;
    });
  }, []);

  const reorderPlaylist = useCallback((playlistId: string, fromIndex: number, toIndex: number) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id !== playlistId) return p;
        const episodes = [...p.episodes];
        const [moved] = episodes.splice(fromIndex, 1);
        episodes.splice(toIndex, 0, moved);
        return { ...p, episodes, updatedAt: new Date().toISOString() };
      });
      savePlaylists(updated);
      return updated;
    });
  }, []);

  const getPlaylist = useCallback((id: string) => {
    return playlists.find(p => p.id === id);
  }, [playlists]);

  return (
    <PlaylistContext.Provider value={{
      playlists,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      reorderPlaylist,
      getPlaylist,
    }}>
      {children}
    </PlaylistContext.Provider>
  );
}
