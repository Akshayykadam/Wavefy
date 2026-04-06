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
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { usePlayer } from "@/contexts/PlayerContext";

export default function ProfileScreen() {
  const { continuationSettings, updateContinuationSetting } = usePlayer();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Autoplay Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Autoplay Settings</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <PlayCircle color={Colors.primaryText} size={24} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingText}>Enable Autoplay</Text>
                  <Text style={styles.settingDescription}>
                    Automatically play next episode when current ends
                  </Text>
                </View>
              </View>
              <Switch
                value={continuationSettings.autoplayEnabled}
                onValueChange={(value) => updateContinuationSetting('autoplayEnabled', value)}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor={Colors.primaryText}
              />
            </View>

            <View style={[styles.settingItem, !continuationSettings.autoplayEnabled && styles.settingDisabled]}>
              <View style={styles.settingLeft}>
                <ListPlus color={continuationSettings.autoplayEnabled ? Colors.primaryText : Colors.secondaryText} size={24} />
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
                thumbColor={Colors.primaryText}
                disabled={!continuationSettings.autoplayEnabled}
              />
            </View>

            <View style={[styles.settingItem, !continuationSettings.autoplayEnabled && styles.settingDisabled]}>
              <View style={styles.settingLeft}>
                <Sparkles color={continuationSettings.autoplayEnabled ? Colors.primaryText : Colors.secondaryText} size={24} />
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
                thumbColor={Colors.primaryText}
                disabled={!continuationSettings.autoplayEnabled}
              />
            </View>

            <View style={[styles.settingItem, !continuationSettings.autoplayEnabled && styles.settingDisabled]}>
              <View style={styles.settingLeft}>
                <RotateCcw color={continuationSettings.autoplayEnabled ? Colors.primaryText : Colors.secondaryText} size={24} />
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
                thumbColor={Colors.primaryText}
                disabled={!continuationSettings.autoplayEnabled}
              />
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            <Pressable style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Bell color={Colors.primaryText} size={24} />
                <Text style={styles.settingText}>Notifications</Text>
              </View>
            </Pressable>

            <Pressable style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Download color={Colors.primaryText} size={24} />
                <Text style={styles.settingText}>Download Settings</Text>
              </View>
            </Pressable>

            <Pressable style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Moon color={Colors.primaryText} size={24} />
                <Text style={styles.settingText}>Dark Mode</Text>
              </View>
              <Text style={styles.settingValue}>Always On</Text>
            </Pressable>

            <Pressable style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Settings color={Colors.primaryText} size={24} />
                <Text style={styles.settingText}>Playback Settings</Text>
              </View>
            </Pressable>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: Colors.primaryText,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.primaryText,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: Colors.primaryText,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  textDisabled: {
    color: Colors.secondaryText,
  },
  settingValue: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
});
