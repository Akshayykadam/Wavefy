/**
 * Utility to get optimized thumbnail artwork URLs for fast loading.
 * Replaces high-res iTunes 600x600 images with lightweight 100x100 or 160x160 thumbnails for list items.
 */
export function getOptimizedArtwork(
  url: string | undefined | null,
  targetSize: 100 | 160 | 300 | 600 = 160
): string {
  if (!url) return '';
  if (targetSize >= 600) return url;

  // iTunes artwork URL pattern replacement (600x600 -> 160x160 or 100x100)
  if (url.includes('mzstatic.com') || url.includes('/600x600')) {
    return url
      .replace(/600x600bb/g, `${targetSize}x${targetSize}bb`)
      .replace(/600x600/g, `${targetSize}x${targetSize}`);
  }

  return url;
}
