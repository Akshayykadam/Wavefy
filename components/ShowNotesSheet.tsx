import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  Share,
} from 'react-native';
import {
  X,
  ExternalLink,
  Calendar,
  Clock,
  Link2,
  Share2,
  Sparkles,
  PlayCircle,
  Globe,
  Youtube,
  Twitter,
  Instagram,
  HeartHandshake,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { usePlayer } from '@/contexts/PlayerContext';

interface ShowNotesSheetProps {
  visible: boolean;
  onClose: () => void;
  episodeTitle: string;
  podcastName: string;
  pubDate: string;
  duration: number;
  descriptionHtml?: string;
  description?: string;
}

export interface ExtractedLink {
  url: string;
  label: string;
  domain: string;
  brandColor: string;
  category: 'youtube' | 'social' | 'support' | 'audio' | 'website';
}

export interface ExtractedTimestamp {
  raw: string;
  label: string;
  seconds: number;
}

// Convert timestamp string (01:23 or 1:05:30) to seconds
const parseTimestampSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

// Brand & Metadata detector for links
const getLinkMetadata = (url: string, anchorLabel?: string): ExtractedLink => {
  const lower = url.toLowerCase();
  let domain = 'website';
  let brandColor = Colors.accent;
  let category: ExtractedLink['category'] = 'website';

  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch {
    domain = url.slice(0, 30);
  }

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    brandColor = '#FF0000';
    category = 'youtube';
  } else if (lower.includes('twitter.com') || lower.includes('x.com')) {
    brandColor = '#1DA1F2';
    category = 'social';
  } else if (lower.includes('instagram.com')) {
    brandColor = '#E1306C';
    category = 'social';
  } else if (lower.includes('patreon.com') || lower.includes('buymeacoffee.com')) {
    brandColor = '#FF424D';
    category = 'support';
  } else if (lower.includes('spotify.com') || lower.includes('apple.com')) {
    brandColor = '#1DB954';
    category = 'audio';
  }

  let label = anchorLabel && anchorLabel.length > 2 ? anchorLabel : domain;
  // Clean up label
  label = label.replace(/<[^>]*>/g, '').trim();

  return {
    url,
    label: label.length > 50 ? label.slice(0, 50) + '...' : label,
    domain,
    brandColor,
    category,
  };
};

// Extract links from HTML and text
const extractLinks = (content: string): ExtractedLink[] => {
  const linksMap = new Map<string, ExtractedLink>();

  // 1. Extract HTML <a> tags with inner text
  const aTagRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = aTagRegex.exec(content)) !== null) {
    const url = match[1];
    const anchorText = match[2];
    if (url.startsWith('http')) {
      linksMap.set(url, getLinkMetadata(url, anchorText));
    }
  }

  // 2. Extract plain text URLs
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  const plainUrls = content.match(urlRegex) || [];
  for (const url of plainUrls) {
    if (!linksMap.has(url)) {
      linksMap.set(url, getLinkMetadata(url));
    }
  }

  return Array.from(linksMap.values()).slice(0, 15);
};

// Extract timestamps with context
const extractTimestamps = (text: string): ExtractedTimestamp[] => {
  const timestamps: ExtractedTimestamp[] = [];
  const regex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—:\s]*([^\n<]{0,60})/g;
  let match;
  const seenSeconds = new Set<number>();

  while ((match = regex.exec(text)) !== null) {
    const raw = match[1];
    const context = match[2].trim().replace(/<[^>]*>/g, '');
    const seconds = parseTimestampSeconds(raw);

    if (seconds >= 0 && !seenSeconds.has(seconds)) {
      seenSeconds.add(seconds);
      timestamps.push({
        raw,
        label: context.length > 0 ? context : `Jump to ${raw}`,
        seconds,
      });
    }
  }

  return timestamps;
};

// Format duration
const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
};

// Format date
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function ShowNotesSheet({
  visible,
  onClose,
  episodeTitle,
  podcastName,
  pubDate,
  duration,
  descriptionHtml,
  description,
}: ShowNotesSheetProps) {
  const { seekTo, isPlaying, togglePlayPause } = usePlayer();
  const [activeTab, setActiveTab] = useState<'notes' | 'links' | 'timestamps'>('notes');

  const rawContent = descriptionHtml || description || '';
  const links = extractLinks(rawContent);
  const timestamps = extractTimestamps(rawContent);

  // Clean plain text formatting
  const plainText = rawContent
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  • ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const handleSeek = (seconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    seekTo(seconds * 1000);
    if (!isPlaying) {
      togglePlayPause();
    }
    onClose();
  };

  const handleShareLink = async (url: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        url,
        message: `${label}: ${url}`,
      });
    } catch (e) {
      // silent catch
    }
  };

  const handleOpenLink = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  const renderBrandIcon = (category: ExtractedLink['category'], brandColor: string) => {
    switch (category) {
      case 'youtube':
        return <Youtube color={brandColor} size={18} />;
      case 'social':
        return <Twitter color={brandColor} size={18} />;
      case 'support':
        return <HeartHandshake color={brandColor} size={18} />;
      case 'audio':
        return <PlayCircle color={brandColor} size={18} />;
      default:
        return <Globe color={brandColor} size={18} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.overlay} />
        </Pressable>

        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Sparkles color={Colors.accent} size={20} />
              <Text style={styles.headerTitle}>Show Notes</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color={Colors.primaryText} size={20} />
            </Pressable>
          </View>

          {/* Episode Summary Card */}
          <View style={styles.episodeSummaryCard}>
            <Text style={styles.episodeTitle} numberOfLines={2}>
              {episodeTitle}
            </Text>
            <Text style={styles.podcastName} numberOfLines={1}>
              {podcastName}
            </Text>
            <View style={styles.metaRow}>
              {pubDate ? (
                <View style={styles.metaItem}>
                  <Calendar color={Colors.secondaryText} size={13} />
                  <Text style={styles.metaText}>{formatDate(pubDate)}</Text>
                </View>
              ) : null}
              {duration > 0 ? (
                <View style={styles.metaItem}>
                  <Clock color={Colors.secondaryText} size={13} />
                  <Text style={styles.metaText}>{formatDuration(duration)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Filter Tabs */}
          {(links.length > 0 || timestamps.length > 0) && (
            <View style={styles.tabsRow}>
              <Pressable
                style={[styles.tabBtn, activeTab === 'notes' && styles.tabBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab('notes');
                }}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'notes' && styles.tabBtnTextActive,
                  ]}
                >
                  Notes
                </Text>
              </Pressable>

              {links.length > 0 && (
                <Pressable
                  style={[styles.tabBtn, activeTab === 'links' && styles.tabBtnActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('links');
                  }}
                >
                  <Link2
                    size={14}
                    color={activeTab === 'links' ? Colors.black : Colors.secondaryText}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === 'links' && styles.tabBtnTextActive,
                    ]}
                  >
                    Links ({links.length})
                  </Text>
                </Pressable>
              )}

              {timestamps.length > 0 && (
                <Pressable
                  style={[
                    styles.tabBtn,
                    activeTab === 'timestamps' && styles.tabBtnActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('timestamps');
                  }}
                >
                  <PlayCircle
                    size={14}
                    color={
                      activeTab === 'timestamps' ? Colors.black : Colors.secondaryText
                    }
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === 'timestamps' && styles.tabBtnTextActive,
                    ]}
                  >
                    Chapters ({timestamps.length})
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Tab: Notes */}
            {activeTab === 'notes' && (
              <View>
                {plainText ? (
                  plainText.split('\n\n').map((paragraph, index) => (
                    <Text key={`p-${index}`} style={styles.descriptionParagraph}>
                      {paragraph}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.emptyText}>
                    No show notes available for this episode.
                  </Text>
                )}

                {/* Inline Links Preview */}
                {links.length > 0 && (
                  <View style={styles.inlineSection}>
                    <Text style={styles.sectionHeaderTitle}>Links Mentioned</Text>
                    {links.slice(0, 5).map((link, idx) => (
                      <Pressable
                        key={`inline-link-${idx}`}
                        style={({ pressed }) => [
                          styles.linkCard,
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => handleOpenLink(link.url)}
                      >
                        <View
                          style={[
                            styles.linkIconBadge,
                            { backgroundColor: link.brandColor + '20' },
                          ]}
                        >
                          {renderBrandIcon(link.category, link.brandColor)}
                        </View>

                        <View style={styles.linkInfo}>
                          <Text style={styles.linkLabel} numberOfLines={1}>
                            {link.label}
                          </Text>
                          <Text style={styles.linkDomain} numberOfLines={1}>
                            {link.domain}
                          </Text>
                        </View>

                        <ExternalLink color={Colors.secondaryText} size={16} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Tab: Links */}
            {activeTab === 'links' && (
              <View>
                <Text style={styles.tabSectionTitle}>Shared Resources & Links</Text>
                {links.map((link, idx) => (
                  <View key={`full-link-${idx}`} style={styles.linkCardFull}>
                    <View
                      style={[
                        styles.linkIconBadge,
                        { backgroundColor: link.brandColor + '25' },
                      ]}
                    >
                      {renderBrandIcon(link.category, link.brandColor)}
                    </View>

                    <View style={styles.linkInfo}>
                      <Text style={styles.linkLabel} numberOfLines={2}>
                        {link.label}
                      </Text>
                      <Text style={styles.linkDomain}>{link.domain}</Text>
                    </View>

                    <View style={styles.linkActions}>
                      <Pressable
                        style={styles.linkActionBtn}
                        onPress={() => handleShareLink(link.url, link.label)}
                      >
                        <Share2 color={Colors.primaryText} size={16} />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.linkActionBtnPrimary,
                          { backgroundColor: link.brandColor },
                        ]}
                        onPress={() => handleOpenLink(link.url)}
                      >
                        <ExternalLink color="#FFF" size={16} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Tab: Timestamps */}
            {activeTab === 'timestamps' && (
              <View>
                <Text style={styles.tabSectionTitle}>Chapter Timestamps</Text>
                {timestamps.map((ts, idx) => (
                  <Pressable
                    key={`ts-${idx}`}
                    style={({ pressed }) => [
                      styles.timestampRow,
                      pressed && styles.timestampRowPressed,
                    ]}
                    onPress={() => handleSeek(ts.seconds)}
                  >
                    <View style={styles.timestampBadge}>
                      <PlayCircle color={Colors.accent} size={14} />
                      <Text style={styles.timestampBadgeText}>{ts.raw}</Text>
                    </View>
                    <Text style={styles.timestampLabel} numberOfLines={2}>
                      {ts.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingTop: 10,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha10,
  },
  dragHandle: {
    width: 42,
    height: 5,
    backgroundColor: Colors.whiteAlpha20,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryText,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeSummaryCard: {
    backgroundColor: Colors.whiteAlpha05,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha05,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryText,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  podcastName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
    marginTop: 4,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.whiteAlpha05,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha05,
  },
  tabBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  tabBtnTextActive: {
    color: Colors.black,
  },
  content: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  descriptionParagraph: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.88)',
    marginBottom: 14,
    letterSpacing: -0.1,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.secondaryText,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 24,
  },
  inlineSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.whiteAlpha10,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryText,
    marginBottom: 12,
  },
  tabSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryText,
    marginBottom: 14,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.whiteAlpha05,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha05,
  },
  linkCardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.whiteAlpha05,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha05,
  },
  linkIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfo: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryText,
    marginBottom: 2,
  },
  linkDomain: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  linkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkActionBtnPrimary: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.whiteAlpha05,
    padding: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha05,
  },
  timestampRowPressed: {
    backgroundColor: Colors.whiteAlpha10,
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  timestampBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  timestampLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.primaryText,
    fontWeight: '500',
  },
});
