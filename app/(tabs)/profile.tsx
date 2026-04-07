import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Settings,
  Bell,
  Download,
  Moon,
  PlayCircle,
  ListPlus,
  Sparkles,
  RotateCcw,
  ChevronRight,
  User,
  Headphones,
  Heart,
  Clock,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFollowedPodcasts } from "@/contexts/FollowedPodcastsContext";
import { useLikedEpisodes } from "@/contexts/LikedEpisodesContext";

export default function ProfileScreen() {
  const { continuationSettings, updateContinuationSetting, getListeningHistory } = usePlayer();
  const { followedPodcasts } = useFollowedPodcasts();
  const { likedEpisodes } = useLikedEpisodes();
  const history = getListeningHistory ? getListeningHistory() : [];

  const stats = [
    { label: 'Following', value: followedPodcasts.length, icon: Headphones },
    { label: 'Liked', value: likedEpisodes.length, icon: Heart },
    { label: 'Listened', value: history.length, icon: Clock },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User color={Colors.primaryText} size={36} />
              </View>
              <View style={styles.avatarGlow} />
            </View>
            <Text style={styles.profileName}>Podcast Listener</Text>
            <Text style={styles.profileSub}>Your personalized experience</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <stat.icon color={Colors.accent} size={16} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Autoplay Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Autoplay Settings</Text>
            <View style={styles.settingsCard}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIconBg, { backgroundColor: 'rgba(255, 45, 85, 0.12)' }]}>
                    <PlayCircle color={Colors.accent} size={20} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Enable Autoplay</Text>
                    <Text style={styles.settingDescription}>
                      Auto-play next episode when current ends
                    </Text>
                  </View>
                </View>
                <Switch
                  value={continuationSettings.autoplayEnabled}
                  onValueChange={(value) => updateContinuationSetting('autoplayEnabled', value)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.settingDivider} />

              <View style={[styles.settingItem, !continuationSettings.autoplayEnabled && styles.settingDisabled]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                    <ListPlus color="#8B5CF6" size={20} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingText, !continuationSettings.autoplayEnabled && styles.textDisabled]}>
                      Auto-queue from Creator
                    </Text>
                    <Text style={[styles.settingDescription, !continuationSettings.autoplayEnabled && styles.textDisabled]}>
                      Add more episodes from the same podcaster
                    </Text>
                  </View>
                </View>
                <Switch
                  value={continuationSettings.autoQueueFromCreator}
                  onValueChange={(value) => updateContinuationSetting('autoQueueFromCreator', value)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                  disabled={!continuationSettings.autoplayEnabled}
                />
              </View>

              <View style={styles.settingDivider} />

              <View style={[styles.settingItem, !continuationSettings.autoplayEnabled && styles.settingDisabled]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <Sparkles color="#F59E0B" size={20} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingText, !continuationSettings.autoplayEnabled && styles.textDisabled]}>
                      More Like This
                    </Text>
                    <Text style={[styles.settingDescription, !continuationSettings.autoplayEnabled && styles.textDisabled]}>
                      Play similar episodes based on category
                    </Text>
                  </View>
                </View>
                <Switch
                  value={continuationSettings.moreLikeThisEnabled}
                  onValueChange={(value) => updateContinuationSetting('moreLikeThisEnabled', value)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                  disabled={!continuationSettings.autoplayEnabled}
                />
              </View>

              <View style={styles.settingDivider} />

              <View style={[styles.settingItem, !continuationSettings.autoplayEnabled && styles.settingDisabled]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIconBg, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}>
                    <RotateCcw color="#06B6D4" size={20} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingText, !continuationSettings.autoplayEnabled && styles.textDisabled]}>
                      Allow Replay
                    </Text>
                    <Text style={[styles.settingDescription, !continuationSettings.autoplayEnabled && styles.textDisabled]}>
                      Include already played episodes in autoplay
                    </Text>
                  </View>
                </View>
                <Switch
                  value={continuationSettings.allowReplayCompleted}
                  onValueChange={(value) => updateContinuationSetting('allowReplayCompleted', value)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={'#fff'}
                  disabled={!continuationSettings.autoplayEnabled}
                />
              </View>
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.settingsCard}>
              <Pressable style={({ pressed }) => [styles.prefItem, pressed && { backgroundColor: Colors.surfaceLight }]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIconBg, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
                    <Bell color={Colors.success} size={20} />
                  </View>
                  <Text style={styles.settingText}>Notifications</Text>
                </View>
                <ChevronRight color={Colors.secondaryText} size={18} />
              </Pressable>

              <View style={styles.settingDivider} />

              <Pressable style={({ pressed }) => [styles.prefItem, pressed && { backgroundColor: Colors.surfaceLight }]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                    <Download color="#3b82f6" size={20} />
                  </View>
                  <Text style={styles.settingText}>Download Settings</Text>
                </View>
                <ChevronRight color={Colors.secondaryText} size={18} />
              </Pressable>

              <View style={styles.settingDivider} />

              <Pressable style={({ pressed }) => [styles.prefItem, pressed && { backgroundColor: Colors.surfaceLight }]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                    <Moon color="#8B5CF6" size={20} />
                  </View>
                  <Text style={styles.settingText}>Dark Mode</Text>
                </View>
                <View style={styles.settingValueTag}>
                  <Text style={styles.settingValue}>Always On</Text>
                </View>
              </Pressable>

              <View style={styles.settingDivider} />

              <Pressable style={({ pressed }) => [styles.prefItem, pressed && { backgroundColor: Colors.surfaceLight }]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIconBg, { backgroundColor: 'rgba(236, 72, 153, 0.12)' }]}>
                    <Settings color="#EC4899" size={20} />
                  </View>
                  <Text style={styles.settingText}>Playback Settings</Text>
                </View>
                <ChevronRight color={Colors.secondaryText} size={18} />
              </Pressable>
            </View>
          </View>

          {/* App version */}
          <Text style={styles.versionText}>CastBee v2.0.0</Text>
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
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  avatarGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentGlow,
    top: 0,
    left: 0,
    transform: [{ scale: 1.3 }],
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primaryText,
    letterSpacing: -0.4,
  },
  profileSub: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginTop: 4,
    letterSpacing: -0.2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    minWidth: 90,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.whiteAlpha05,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryText,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.primaryText,
    paddingHorizontal: 20,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  settingsCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.whiteAlpha05,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  prefItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 0,
  },
  settingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 56,
  },
  settingDisabled: {
    opacity: 0.4,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.primaryText,
    letterSpacing: -0.2,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  textDisabled: {
    color: Colors.secondaryText,
  },
  settingValueTag: {
    backgroundColor: Colors.whiteAlpha05,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.secondaryText,
  },
  versionText: {
    textAlign: 'center',
    color: Colors.secondaryText,
    fontSize: 12,
    marginTop: 32,
    opacity: 0.5,
  },
});
