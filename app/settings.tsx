import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import {
  ArrowLeft,
  Settings,
  HardDrive,
  Trash2,
  Info,
  Github,
  ChevronRight,
  Music,
  Download,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { usePlayer } from "@/contexts/PlayerContext";
import { useDownloads } from "@/contexts/DownloadContext";
import pkg from "../package.json";

interface UpdateInfo {
  version: string;
  notes: string;
  apkUrl: string;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'downloaded' | 'error';

export default function SettingsScreen() {
  const router = useRouter();
  const { continuationSettings, updateContinuationSetting, clearHistory } = usePlayer();
  const { downloads, deleteDownload } = useDownloads();

  // Settings states
  const [streamWifiOnly, setStreamWifiOnly] = useState(false);
  const [downloadWifiOnly, setDownloadWifiOnly] = useState(false);
  const [preferredQuality, setPreferredQuality] = useState('High');

  // Cache state
  const [cacheSize, setCacheSize] = useState("0 B");

  // In-App update states
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Load Wi-Fi preferences on mount
  useEffect(() => {
    (async () => {
      // Load wifi preferences from file system or AsyncStorage
      calculateCacheSize();
    })();
  }, [downloads]);

  // Version comparison helper: v1 > v2 returns 1, v1 < v2 returns -1, v1 == v2 returns 0
  const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.replace(/^v/, '').split('.').map(Number);
    const parts2 = v2.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  };

  // Check for updates
  const checkUpdates = async () => {
    setUpdateStatus('checking');
    try {
      // Fetch latest release from GitHub API
      const response = await fetch('https://api.github.com/repos/Akshayykadam/Wavefy/releases/latest');
      if (!response.ok) throw new Error('Failed to fetch release');
      const data = await response.json();
      
      const latestVersion = data.tag_name;
      const currentVersion = `v${pkg.version}`;
      
      const isNewer = compareVersions(latestVersion, currentVersion) > 0;
      
      if (isNewer) {
        // Find APK asset
        const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));
        if (apkAsset) {
          setUpdateInfo({
            version: latestVersion,
            notes: data.body || 'No release notes provided.',
            apkUrl: apkAsset.browser_download_url,
          });
          setUpdateStatus('available');
        } else {
          setUpdateStatus('up-to-date');
        }
      } else {
        setUpdateStatus('up-to-date');
      }
    } catch (error) {
      console.error('Update check failed:', error);
      setUpdateStatus('error');
    }
  };

  // Download update APK
  const downloadUpdate = async () => {
    if (!updateInfo) return;
    try {
      setUpdateStatus('downloading');
      setDownloadProgress(0);
      
      const localUri = FileSystem.documentDirectory + 'update.apk';
      
      // Delete existing APK file if present
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localUri);
      }
      
      const downloadResumable = FileSystem.createDownloadResumable(
        updateInfo.apkUrl,
        localUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );
      
      const result = await downloadResumable.downloadAsync();
      if (result && result.uri) {
        setUpdateStatus('downloaded');
      } else {
        setUpdateStatus('error');
      }
    } catch (error) {
      console.error('Download failed:', error);
      setUpdateStatus('error');
    }
  };

  // Trigger package installer to install the update
  const installUpdate = async () => {
    try {
      const localUri = FileSystem.documentDirectory + 'update.apk';
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Update file not found. Please download again.');
        setUpdateStatus('available');
        return;
      }
      
      // Get standard content provider URI for Android 7.0+
      const contentUri = await FileSystem.getContentUriAsync(localUri);
      
      // Launch standard Android Package Installer Intent
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
      });
    } catch (error) {
      console.error('Installation trigger failed:', error);
      Alert.alert(
        'Installation failed',
        'Could not launch installer. Ensure you have allowed installing unknown apps from Wavefy in Android Settings.'
      );
    }
  };

  // Calculate local downloads folder size
  const calculateCacheSize = async () => {
    try {
      const localUri = FileSystem.documentDirectory + 'downloads/';
      const dirInfo = await FileSystem.getInfoAsync(localUri);
      if (!dirInfo.exists) {
        setCacheSize("0 B");
        return;
      }
      
      const files = await FileSystem.readDirectoryAsync(localUri);
      let totalBytes = 0;
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(localUri + file);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          totalBytes += fileInfo.size;
        }
      }
      
      setCacheSize(formatBytes(totalBytes));
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      setCacheSize("Unknown");
    }
  };

  // Format size helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Clear cache action
  const handleClearCache = () => {
    const downloadKeys = Object.keys(downloads);
    if (downloadKeys.length === 0) {
      Alert.alert("Cache is empty", "You have no downloaded episodes.");
      return;
    }
    
    Alert.alert(
      "Clear Downloads",
      `Are you sure you want to delete all ${downloadKeys.length} downloaded episodes?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            for (const key of downloadKeys) {
              await deleteDownload(key);
            }
            calculateCacheSize();
            Alert.alert("Success", "All downloaded episodes cleared.");
          }
        }
      ]
    );
  };

  // Clear history action
  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear your listening history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            if (clearHistory) {
              clearHistory();
              Alert.alert("Success", "Listening history cleared.");
            }
          }
        }
      ]
    );
  };

  // Cycle streaming quality setting
  const cycleQuality = () => {
    const qualities = ['Low', 'Medium', 'High'];
    const nextIndex = (qualities.indexOf(preferredQuality) + 1) % qualities.length;
    setPreferredQuality(qualities[nextIndex]);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color={Colors.primaryText} size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          
          {/* In-App Updater Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Updates</Text>
            <View style={styles.card}>
              {updateStatus === 'idle' && (
                <View style={styles.updateRow}>
                  <View style={styles.updateLeft}>
                    <Text style={styles.settingText}>Check for Updates</Text>
                    <Text style={styles.settingDescription}>Current version: v{pkg.version}</Text>
                  </View>
                  <Pressable style={styles.updateButton} onPress={checkUpdates}>
                    <Text style={styles.updateButtonText}>Check</Text>
                  </Pressable>
                </View>
              )}

              {updateStatus === 'checking' && (
                <View style={styles.updateCenter}>
                  <ActivityIndicator size="small" color={Colors.accent} style={{ marginBottom: 8 }} />
                  <Text style={styles.settingDescription}>Checking GitHub for updates...</Text>
                </View>
              )}

              {updateStatus === 'up-to-date' && (
                <View style={styles.updateCenter}>
                  <CheckCircle color={Colors.success || "#34C759"} size={28} style={{ marginBottom: 6 }} />
                  <Text style={styles.settingText}>You are up to date!</Text>
                  <Text style={styles.settingDescription}>Running Wavefy v{pkg.version}</Text>
                  <Pressable style={[styles.updateButton, { marginTop: 10 }]} onPress={checkUpdates}>
                    <Text style={styles.updateButtonText}>Check Again</Text>
                  </Pressable>
                </View>
              )}

              {updateStatus === 'available' && updateInfo && (
                <View style={styles.updateDetails}>
                  <View style={styles.updateHeaderRow}>
                    <AlertTriangle color={Colors.accent} size={20} />
                    <Text style={styles.updateTitle}>New Update Available ({updateInfo.version})</Text>
                  </View>
                  <Text style={styles.changelogTitle}>Changelog:</Text>
                  <Text style={styles.changelogText} numberOfLines={4}>{updateInfo.notes}</Text>
                  <Pressable style={styles.downloadButton} onPress={downloadUpdate}>
                    <Text style={styles.downloadButtonText}>Download Update (APK)</Text>
                  </Pressable>
                </View>
              )}

              {updateStatus === 'downloading' && (
                <View style={styles.updateCenter}>
                  <ActivityIndicator size="small" color={Colors.accent} style={{ marginBottom: 10 }} />
                  <Text style={styles.settingText}>Downloading Update...</Text>
                  <Text style={styles.settingDescription}>{Math.round(downloadProgress * 100)}% Completed</Text>
                  {/* Progress Bar Container */}
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${downloadProgress * 100}%` }]} />
                  </View>
                </View>
              )}

              {updateStatus === 'downloaded' && (
                <View style={styles.updateDetails}>
                  <CheckCircle color={Colors.success || "#34C759"} size={32} style={{ alignSelf: 'center', marginBottom: 8 }} />
                  <Text style={[styles.settingText, { alignSelf: 'center', marginBottom: 4 }]}>Download Completed!</Text>
                  <Text style={[styles.settingDescription, { alignSelf: 'center', marginBottom: 12 }]}>Ready to install the new update file.</Text>
                  <Pressable style={styles.downloadButton} onPress={installUpdate}>
                    <Text style={styles.downloadButtonText}>Install Now</Text>
                  </Pressable>
                </View>
              )}

              {updateStatus === 'error' && (
                <View style={styles.updateCenter}>
                  <AlertTriangle color="#FF3B30" size={28} style={{ marginBottom: 6 }} />
                  <Text style={styles.settingText}>Update Check Failed</Text>
                  <Text style={styles.settingDescription}>Could not connect to GitHub releases.</Text>
                  <Pressable style={[styles.updateButton, { marginTop: 10 }]} onPress={checkUpdates}>
                    <Text style={styles.updateButtonText}>Retry</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {/* Autoplay & Playback Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Autoplay Settings</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Enable Autoplay</Text>
                  <Text style={styles.settingDescription}>Automatically play the next episode</Text>
                </View>
                <Switch
                  value={continuationSettings.autoplayEnabled}
                  onValueChange={(val) => updateContinuationSetting("autoplayEnabled", val)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.divider} />

              <View style={[styles.settingRow, !continuationSettings.autoplayEnabled && styles.settingDisabled]}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Queue Creator Episodes</Text>
                  <Text style={styles.settingDescription}>Queue next episodes from the same podcaster</Text>
                </View>
                <Switch
                  value={continuationSettings.autoQueueFromCreator}
                  disabled={!continuationSettings.autoplayEnabled}
                  onValueChange={(val) => updateContinuationSetting("autoQueueFromCreator", val)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.divider} />

              <View style={[styles.settingRow, !continuationSettings.autoplayEnabled && styles.settingDisabled]}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>More Like This Recommendations</Text>
                  <Text style={styles.settingDescription}>Add similar category podcasts to play next</Text>
                </View>
                <Switch
                  value={continuationSettings.moreLikeThisEnabled}
                  disabled={!continuationSettings.autoplayEnabled}
                  onValueChange={(val) => updateContinuationSetting("moreLikeThisEnabled", val)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.divider} />

              <View style={[styles.settingRow, !continuationSettings.autoplayEnabled && styles.settingDisabled]}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Allow Replaying Completed</Text>
                  <Text style={styles.settingDescription}>Include played episodes in autoplay queues</Text>
                </View>
                <Switch
                  value={continuationSettings.allowReplayCompleted}
                  disabled={!continuationSettings.autoplayEnabled}
                  onValueChange={(val) => updateContinuationSetting("allowReplayCompleted", val)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                />
              </View>
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Network & Playback</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Stream Over Wi-Fi Only</Text>
                  <Text style={styles.settingDescription}>Save mobile data when listening online</Text>
                </View>
                <Switch
                  value={streamWifiOnly}
                  onValueChange={setStreamWifiOnly}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Download Over Wi-Fi Only</Text>
                  <Text style={styles.settingDescription}>Restrict audio downloads to Wi-Fi connection</Text>
                </View>
                <Switch
                  value={downloadWifiOnly}
                  onValueChange={setDownloadWifiOnly}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.divider} />

              <Pressable style={({ pressed }) => [styles.prefItem, pressed && { backgroundColor: Colors.surfaceLight }]} onPress={cycleQuality}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Audio Streaming Quality</Text>
                  <Text style={styles.settingDescription}>Current Quality: {preferredQuality}</Text>
                </View>
                <ChevronRight color={Colors.secondaryText} size={18} />
              </Pressable>
            </View>
          </View>

          {/* Storage & Disk Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cache & Storage</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Offline Audio Files Cache</Text>
                  <Text style={styles.settingDescription}>Storage Used: {cacheSize}</Text>
                </View>
                <Pressable style={({ pressed }) => [styles.deleteAction, pressed && { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]} onPress={handleClearCache}>
                  <Trash2 color="#FF3B30" size={18} />
                </Pressable>
              </View>

              <View style={styles.divider} />

              <Pressable style={({ pressed }) => [styles.prefItem, pressed && { backgroundColor: Colors.surfaceLight }]} onPress={handleClearHistory}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Clear Listening History</Text>
                  <Text style={styles.settingDescription}>Remove all tracked playback progress logs</Text>
                </View>
                <Trash2 color={Colors.secondaryText} size={18} />
              </Pressable>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Wavefy App</Text>
                  <Text style={styles.settingDescription}>Where Stories Buzz. Built with React Native & Expo.</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Version</Text>
                  <Text style={styles.settingDescription}>{pkg.version} (Release)</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Open Source Code</Text>
                  <Text style={styles.settingDescription}>Feel free to inspect or contribute on GitHub</Text>
                </View>
                <View style={styles.iconBg}>
                  <Github color={Colors.secondaryText} size={18} />
                </View>
              </View>
            </View>
          </View>
          
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primaryText,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.whiteAlpha05 || 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flex: 1,
    paddingRight: 16,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primaryText,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 18,
  },
  settingDisabled: {
    opacity: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border || '#222',
    marginHorizontal: 16,
  },
  prefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deleteAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  updateLeft: {
    flex: 1,
    paddingRight: 16,
  },
  updateButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  updateCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  updateDetails: {
    padding: 16,
  },
  updateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryText,
    flex: 1,
  },
  changelogTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 4,
  },
  changelogText: {
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 18,
    marginBottom: 16,
  },
  downloadButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.whiteAlpha10 || 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
});
