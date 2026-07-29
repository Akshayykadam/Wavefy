import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'wavefy_continuation_settings';

export interface ContinuationSettings {
    autoplayEnabled: boolean;           // Master toggle for all autoplay
    autoQueueFromCreator: boolean;      // Queue more episodes from the same podcaster
    moreLikeThisEnabled: boolean;       // Enable recommendations based on category
    allowReplayCompleted: boolean;      // Allow replaying completed episodes
}

const DEFAULT_SETTINGS: ContinuationSettings = {
    autoplayEnabled: true,
    autoQueueFromCreator: true,
    moreLikeThisEnabled: true,
    allowReplayCompleted: false,
};

export const [ContinuationSettingsProvider, useContinuationSettings] = createContextHook(() => {
    const [settings, setSettings] = useState<ContinuationSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load settings from storage on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            }
        } catch (error) {
            // silent catch
        } finally {
            setIsLoaded(true);
        }
    };

    const saveSettings = async (newSettings: ContinuationSettings) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        } catch (error) {
            // silent catch
        }
    };

    // Update a specific setting
    const updateSetting = useCallback(<K extends keyof ContinuationSettings>(
        key: K,
        value: ContinuationSettings[K]
    ) => {
        setSettings(prev => {
            const updated = { ...prev, [key]: value };
            saveSettings(updated);
            return updated;
        });
    }, []);

    // Toggle a boolean setting
    const toggleSetting = useCallback((key: keyof ContinuationSettings) => {
        setSettings(prev => {
            const updated = { ...prev, [key]: !prev[key] };
            saveSettings(updated);
            return updated;
        });
    }, []);

    // Reset to defaults
    const resetToDefaults = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
        saveSettings(DEFAULT_SETTINGS);
    }, []);

    return {
        settings,
        isLoaded,
        updateSetting,
        toggleSetting,
        resetToDefaults,
    };
});
