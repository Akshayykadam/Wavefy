import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Linking,
} from 'react-native';
import { X, ExternalLink, Calendar, Clock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Colors from '@/constants/colors';

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

// Extract URLs from text/html
const extractLinks = (text: string): { url: string; label: string }[] => {
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  const matches = text.match(urlRegex) || [];
  const unique = [...new Set(matches)];
  return unique.slice(0, 10).map(url => {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      return { url, label: hostname };
    } catch {
      return { url, label: url.slice(0, 40) };
    }
  });
};

// Strip HTML tags but preserve line breaks
const htmlToPlainText = (html: string): string => {
  return html
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
};

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
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
  const rawContent = descriptionHtml || description || '';
  const plainText = descriptionHtml ? htmlToPlainText(descriptionHtml) : (description || '');
  const links = extractLinks(rawContent);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.overlay} />
        </Pressable>
        <View style={styles.sheet}>
        <View style={styles.dragHandle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Show Notes</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X color={Colors.primaryText} size={20} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Episode Info */}
          <Text style={styles.episodeTitle}>{episodeTitle}</Text>
          <Text style={styles.podcastName}>{podcastName}</Text>

          {/* Meta */}
          <View style={styles.metaRow}>
            {pubDate ? (
              <View style={styles.metaItem}>
                <Calendar color={Colors.secondaryText} size={14} />
                <Text style={styles.metaText}>{formatDate(pubDate)}</Text>
              </View>
            ) : null}
            {duration > 0 ? (
              <View style={styles.metaItem}>
                <Clock color={Colors.secondaryText} size={14} />
                <Text style={styles.metaText}>{formatDuration(duration)}</Text>
              </View>
            ) : null}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          {plainText ? (
            plainText.split('\n').map((paragraph, index) => (
              <Text key={`p-${index}`} style={styles.descriptionText}>
                {paragraph}
              </Text>
            ))
          ) : (
            <Text style={styles.emptyText}>No show notes available for this episode.</Text>
          )}

          {/* Links */}
          {links.length > 0 && (
            <View style={styles.linksSection}>
              <Text style={styles.linksSectionTitle}>Links Mentioned</Text>
              {links.map((link, index) => (
                <Pressable
                  key={`link-${index}`}
                  style={({ pressed }) => [styles.linkItem, pressed && { opacity: 0.7 }]}
                  onPress={() => Linking.openURL(link.url)}
                >
                  <ExternalLink color={Colors.accent} size={14} />
                  <Text style={styles.linkText} numberOfLines={1}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.whiteAlpha20,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryText,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.whiteAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  episodeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primaryText,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  podcastName: {
    fontSize: 14,
    color: Colors.accent,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.whiteAlpha10,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.secondaryText,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  linksSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.whiteAlpha10,
  },
  linksSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryText,
    marginBottom: 12,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.whiteAlpha10,
    borderRadius: 10,
    marginBottom: 6,
  },
  linkText: {
    fontSize: 14,
    color: Colors.accent,
    flex: 1,
  },
});
