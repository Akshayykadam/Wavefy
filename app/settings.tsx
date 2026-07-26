import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Settings,
  HardDrive,
  Trash2,
  Info,
  ChevronRight,
  Zap,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { usePlayer } from "@/contexts/PlayerContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { useAudioQuality } from "@/contexts/AudioQualityContext";
import pkg from "../package.json";

export default function SettingsScreen() {
  const router = useRouter();
  const { continuationSettings, updateContinuationSetting, clearHistory } = usePlayer();
  const { downloads, deleteDownload } = useDownloads();
  const { qualityMode, effectiveQuality, networkType, setQualityMode } = useAudioQuality();

  // Settings states
  const [streamWifiOnly, setStreamWifiOnly] = useState(false);
  const [downloadWifiOnly, setDownloadWifiOnly] = useState(false);
  const [cleanMode, setCleanMode] = useState(false);
  const [preferredQuality, setPreferredQuality] = useState('High');

  useEffect(() => {
    AsyncStorage.getItem('@castbee_clean_mode').then((val) => {
      if (val !== null) setCleanMode(JSON.parse(val));
    });
  }, []);

  const handleToggleCleanMode = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCleanMode(val);
    await AsyncStorage.setItem('@castbee_clean_mode', JSON.stringify(val));
  };

  // Cache state
  const [cacheSize, setCacheSize] = useState("0 B");

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

          {/* Audio Quality & Network Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Audio Quality & Network</Text>
            <View style={styles.card}>
              <View style={styles.qualityHeaderRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Streaming Quality</Text>
                  <Text style={styles.settingDescription}>
                    {qualityMode === 'auto'
                      ? `Adaptive mode active: ${effectiveQuality.toUpperCase()} stream on ${networkType.toUpperCase()}`
                      : `Fixed quality: Always streaming at ${qualityMode.toUpperCase()}`}
                  </Text>
                </View>
                <View style={styles.effectivePill}>
                  <Zap size={12} color={Colors.accent} />
                  <Text style={styles.effectivePillText}>{effectiveQuality.toUpperCase()}</Text>
                </View>
              </View>

              {/* Quality Chips */}
              <View style={styles.qualityOptionsRow}>
                {[
                  { mode: 'auto', label: 'Auto', desc: 'Adaptive' },
                  { mode: 'high', label: 'High', desc: '320 kbps' },
                  { mode: 'medium', label: 'Medium', desc: '160 kbps' },
                  { mode: 'low', label: 'Saver', desc: '96 kbps' },
                ].map((item) => {
                  const isSelected = qualityMode === item.mode;
                  return (
                    <Pressable
                      key={item.mode}
                      style={({ pressed }) => [
                        styles.qualityChip,
                        isSelected && styles.qualityChipActive,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setQualityMode(item.mode as any);
                      }}
                    >
                      <Text style={[styles.qualityChipTitle, isSelected && styles.qualityChipTitleActive]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.qualityChipDesc, isSelected && styles.qualityChipDescActive]}>
                        {item.desc}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.divider} />

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

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Clean Mode (Family Safe)</Text>
                  <Text style={styles.settingDescription}>Hide podcasts with explicit content rating</Text>
                </View>
                <Switch
                  value={cleanMode}
                  onValueChange={handleToggleCleanMode}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                />
              </View>
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
                <Pressable
                  style={({ pressed }) => [styles.deleteAction, pressed && { backgroundColor: 'rgba(255, 59, 48, 0.25)' }]}
                  onPress={handleClearCache}
                  hitSlop={8}
                >
                  <Trash2 color={Colors.accent} size={18} />
                </Pressable>
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Clear Listening History</Text>
                  <Text style={styles.settingDescription}>Remove all tracked playback progress logs</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.deleteAction, pressed && { backgroundColor: 'rgba(255, 59, 48, 0.25)' }]}
                  onPress={handleClearHistory}
                  hitSlop={8}
                >
                  <Trash2 color={Colors.accent} size={18} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Wavefy App</Text>
                  <Text style={styles.settingDescription}>Listen. Discover. Repeat.</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Version</Text>
                  <Text style={styles.settingDescription}>{pkg.version} (Release)</Text>
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
  qualityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  effectivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  effectivePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.accent,
  },
  qualityOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  qualityChip: {
    flex: 1,
    backgroundColor: Colors.whiteAlpha05,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.whiteAlpha05,
  },
  qualityChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  qualityChipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryText,
    marginBottom: 2,
  },
  qualityChipTitleActive: {
    color: Colors.black,
  },
  qualityChipDesc: {
    fontSize: 10,
    color: Colors.secondaryText,
  },
  qualityChipDescActive: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontWeight: '600',
  },
});
