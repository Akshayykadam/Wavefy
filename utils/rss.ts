import { Episode, Chapter } from "@/types/podcast";

// Parse duration from text
export const parseDuration = (text: string | null): number => {
  if (!text) return 0;
  const parts = text.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (!isNaN(Number(text))) return Number(text);
  return 0;
};

// Extract timestamp chapters from description text
export const extractChaptersFromDescription = (text: string): Chapter[] => {
  const chapters: Chapter[] = [];
  // Match patterns like "00:12:30 - Topic Name" or "1:23 Topic Name"
  const regex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—:\s]\s*(.+)/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const parts = match[1].split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (title.length > 0 && title.length < 200) {
      chapters.push({ title, startTime: seconds });
    }
  }
  return chapters;
};

// Parse PSC chapters from RSS
export const parsePscChapters = (itemXml: string): Chapter[] => {
  const chapters: Chapter[] = [];
  const chapterMatches = itemXml.match(/<psc:chapter[^>]*>/gi);
  if (!chapterMatches) return chapters;
  for (const ch of chapterMatches) {
    const startMatch = ch.match(/start=["']([^"']*)["']/i);
    const titleMatch = ch.match(/title=["']([^"']*)["']/i);
    if (startMatch && titleMatch) {
      const parts = startMatch[1].split(':').map(Number);
      let seconds = 0;
      if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
      else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
      chapters.push({ title: titleMatch[1], startTime: seconds });
    }
  }
  return chapters;
};

export const parseRSS = async (url: string): Promise<Episode[]> => {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const episodes: Episode[] = [];
    const itemMatches = text.match(/<item[^>]*>([\s\S]*?)<\/item>/gi);
    if (!itemMatches) return [];
    
    for (let i = 0; i < Math.min(itemMatches.length, 20); i++) {
        const item = itemMatches[i];
        const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const contentMatch = item.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
        const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || item.match(/<itunes:summary[^>]*>([\s\S]*?)<\/itunes:summary>/i);
        const enclosureMatch = item.match(/<enclosure[^>]*url=["']([^"']*)["']/i);
        const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
        const durationMatch = item.match(/<itunes:duration[^>]*>([\s\S]*?)<\/itunes:duration>/i);
        const guidMatch = item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "Unknown Episode";

        let rawDescription = "";
        if (contentMatch) rawDescription = contentMatch[1];
        else if (descMatch) rawDescription = descMatch[1] || descMatch[2] || "";

        // Preserve raw HTML for show notes
        const descriptionHtml = rawDescription.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
        // Strip HTML for plain text preview
        const description = descriptionHtml.replace(/<[^>]*>/g, "").trim();

        const audioUrl = enclosureMatch ? enclosureMatch[1] : "";
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : "";
        const durationText = durationMatch ? durationMatch[1].trim() : "0";
        const guid = guidMatch ? guidMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        const duration = parseDuration(durationText);
        
        let chapters = parsePscChapters(item);
        if (chapters.length === 0) {
            chapters = extractChaptersFromDescription(description);
        }

        episodes.push({ 
            id: guid || String(i), 
            title, 
            descriptionHtml,
            description, 
            audioUrl, 
            pubDate, 
            duration, 
            artwork: "",
            chapters: chapters.length > 0 ? chapters : undefined
        });
    }
    return episodes;
  } catch (error) {
    console.error("Failed to parse RSS:", error);
    return [];
  }
};
